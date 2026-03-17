from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_account, require_admin, CurrentAccount
from app.auth.security import hash_password
from app.models.staff_member import StaffMember
from app.models.staff_workplace_access import StaffWorkplaceAccess
from app.models.workplace import Workplace
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from fastapi import UploadFile, File
import os
import uuid
import shutil

AVATARS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "avatars")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/staff", tags=["Equipe"])


def _staff_to_response(staff: StaffMember) -> dict:
    """Converte StaffMember para dict de resposta."""
    return {
        "id": staff.id,
        "admin_user_id": staff.admin_user_id,
        "name": staff.name,
        "email": staff.email,
        "can_change_status": staff.can_change_status,
        "can_access_documents": getattr(staff, 'can_access_documents', False),
        "is_active": staff.is_active,
        "avatar_url": staff.avatar_url,
        "workplace_ids": [wa.workplace_id for wa in staff.workplace_access],
        "created_at": staff.created_at,
        "updated_at": staff.updated_at,
    }


@router.get("/", response_model=List[StaffResponse])
def list_staff(
    name: str = None,
    is_active: bool = None,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Lista todos os funcionários do admin com filtros opcionais."""
    query = db.query(StaffMember).filter(
        StaffMember.admin_user_id == account.user.id,
    )
    
    if name:
        query = query.filter(StaffMember.name.ilike(f"%{name}%"))
    
    if is_active is not None:
        query = query.filter(StaffMember.is_active == is_active)
        
    staff_list = query.order_by(StaffMember.name).all()
    return [_staff_to_response(s) for s in staff_list]


@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Busca um funcionário pelo ID."""
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.admin_user_id == account.user.id,
    ).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")
    return _staff_to_response(staff)


@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Cria um novo funcionário."""
    # Verificar email único (em users e staff_members)
    from app.models.user import User
    existing_user = db.query(User).filter(User.email == data.email).first()
    existing_staff = db.query(StaffMember).filter(StaffMember.email == data.email).first()
    if existing_user or existing_staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email já está em uso",
        )

    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve ter no mínimo 6 caracteres",
        )

    # Validar workplace_ids pertencentes ao admin
    if data.workplace_ids:
        valid_wps = db.query(Workplace.id).filter(
            Workplace.id.in_(data.workplace_ids),
            Workplace.user_id == account.user.id,
        ).all()
        valid_ids = {w.id for w in valid_wps}
        invalid = set(data.workplace_ids) - valid_ids
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Locais de trabalho inválidos: {invalid}",
            )

    staff = StaffMember(
        admin_user_id=account.user.id,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        can_change_status=data.can_change_status,
        can_access_documents=data.can_access_documents,
    )
    db.add(staff)
    db.flush()  # para obter o id

    # Criar acessos
    for wp_id in data.workplace_ids:
        db.add(StaffWorkplaceAccess(staff_member_id=staff.id, workplace_id=wp_id))

    db.commit()
    db.refresh(staff)
    return _staff_to_response(staff)


@router.put("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: int,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Atualiza dados de um funcionário."""
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.admin_user_id == account.user.id,
    ).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Verificar email único
    if "email" in update_data and update_data["email"] != staff.email:
        from app.models.user import User
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        existing_staff = db.query(StaffMember).filter(
            StaffMember.email == update_data["email"],
            StaffMember.id != staff_id,
        ).first()
        if existing_user or existing_staff:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este email já está em uso",
            )

    # Atualizar senha se fornecida
    if "password" in update_data:
        pwd = update_data.pop("password")
        if pwd and len(pwd) >= 6:
            staff.password_hash = hash_password(pwd)

    # Atualizar workplace_ids se fornecidos
    if "workplace_ids" in update_data:
        wp_ids = update_data.pop("workplace_ids")
        # Validar
        if wp_ids:
            valid_wps = db.query(Workplace.id).filter(
                Workplace.id.in_(wp_ids),
                Workplace.user_id == account.user.id,
            ).all()
            valid_ids = {w.id for w in valid_wps}
            invalid = set(wp_ids) - valid_ids
            if invalid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Locais de trabalho inválidos: {invalid}",
                )
        # Remover acessos antigos
        db.query(StaffWorkplaceAccess).filter(
            StaffWorkplaceAccess.staff_member_id == staff.id,
        ).delete()
        # Adicionar novos
        for wp_id in (wp_ids or []):
            db.add(StaffWorkplaceAccess(staff_member_id=staff.id, workplace_id=wp_id))

    # Aplicar demais campos
    for key, value in update_data.items():
        setattr(staff, key, value)

    db.commit()
    db.refresh(staff)
    return _staff_to_response(staff)


@router.post("/{staff_id}/avatar", response_model=StaffResponse)
def upload_staff_avatar(
    staff_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Upload de foto de perfil para um funcionário."""
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.admin_user_id == account.user.id,
    ).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    # Validar extensão
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de arquivo não permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validar tamanho
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo muito grande. Máximo: 5 MB",
        )

    # Criar diretório se não existir
    os.makedirs(AVATARS_DIR, exist_ok=True)

    # Remover avatar anterior se existir
    if staff.avatar_url:
        old_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            staff.avatar_url.lstrip("/"),
        )
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except:
                pass

    # Salvar novo arquivo
    filename = f"staff_{staff.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(AVATARS_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Atualizar URL no banco
    staff.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(staff)
    return _staff_to_response(staff)


@router.delete("/{staff_id}/avatar", response_model=StaffResponse)
def delete_staff_avatar(
    staff_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Remove a foto de perfil de um funcionário."""
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.admin_user_id == account.user.id,
    ).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    if staff.avatar_url:
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            staff.avatar_url.lstrip("/"),
        )
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass

        staff.avatar_url = None
        db.commit()
        db.refresh(staff)

    return _staff_to_response(staff)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Exclui permanentemente um funcionário."""
    staff = db.query(StaffMember).filter(
        StaffMember.id == staff_id,
        StaffMember.admin_user_id == account.user.id,
    ).first()
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Funcionário não encontrado")

    # Remover avatar se existir
    if staff.avatar_url:
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            staff.avatar_url.lstrip("/"),
        )
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except:
                pass

    db.delete(staff)
    db.commit()
