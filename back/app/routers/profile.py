import os
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_account, require_admin, CurrentAccount
from app.auth.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.schemas.password_reset import MessageResponse

router = APIRouter(prefix="/profile", tags=["Perfil"])

AVATARS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "avatars")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/", response_model=UserResponse)
def get_profile(account: CurrentAccount = Depends(get_current_account)):
    """Retorna dados do perfil do usuário autenticado (admin ou staff)."""
    user = account.user # admin
    
    if account.role == "staff":
        staff = account.staff
        return UserResponse(
            id=user.id,
            name=staff.name,
            email=staff.email,
            avatar_url=staff.avatar_url,
            two_factor_enabled=user.two_factor_enabled,
            monthly_goal=0.0,
            multiple_workplaces=user.multiple_workplaces,
            role="staff",
            created_at=staff.created_at,
            updated_at=staff.updated_at
        )
        
    return user


@router.put("/", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Atualiza nome e/ou email do usuário. Somente admin."""
    current_user = account.user
    update_data = data.model_dump(exclude_unset=True)

    # Verificar email único
    if "email" in update_data and update_data["email"] != current_user.email:
        existing = db.query(User).filter(User.email == update_data["email"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este email já está em uso",
            )
            
    # Verificar restrição de múltiplos locais
    if "multiple_workplaces" in update_data and update_data["multiple_workplaces"] is False:
        from app.models.workplace import Workplace
        active_workplaces_count = db.query(Workplace).filter(
            Workplace.user_id == current_user.id,
            Workplace.is_active == True
        ).count()
        if active_workplaces_count > 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Você possui mais de um local ativo. Inative ou exclua os outros locais antes de desativar esta opção."
            )

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Altera a senha do usuário (exige senha atual). Somente admin."""
    current_user = account.user
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ter no mínimo 6 caracteres",
        )

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return MessageResponse(message="Senha alterada com sucesso!")


@router.post("/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Upload de foto de perfil. Admin ou Staff."""
    target_obj = account.user
    if account.role == "staff":
        target_obj = account.staff
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
    if target_obj.avatar_url:
        old_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            target_obj.avatar_url.lstrip("/"),
        )
        if os.path.exists(old_path):
            os.remove(old_path)

    # Salvar novo arquivo
    prefix = f"staff_{target_obj.id}" if account.role == "staff" else f"admin_{target_obj.id}"
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(AVATARS_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Atualizar URL no banco
    target_obj.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(target_obj)
    
    # Se for staff, buildamos a resposta de UserResponse manualmente para refletir a mudança
    if account.role == "staff":
        return UserResponse(
            id=account.user.id,
            name=target_obj.name,
            email=target_obj.email,
            avatar_url=target_obj.avatar_url,
            two_factor_enabled=account.user.two_factor_enabled,
            monthly_goal=0.0,
            multiple_workplaces=account.user.multiple_workplaces,
            role="staff",
            created_at=target_obj.created_at,
            updated_at=target_obj.updated_at
        )
    
    return target_obj


@router.delete("/avatar", response_model=UserResponse)
def delete_avatar(
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Remove a foto de perfil. Admin ou Staff."""
    target_obj = account.user
    if account.role == "staff":
        target_obj = account.staff

    if target_obj.avatar_url:
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            target_obj.avatar_url.lstrip("/"),
        )
        if os.path.exists(filepath):
            os.remove(filepath)

        target_obj.avatar_url = None
        db.commit()
        db.refresh(target_obj)

    if account.role == "staff":
        return UserResponse(
            id=account.user.id,
            name=target_obj.name,
            email=target_obj.email,
            avatar_url=None,
            two_factor_enabled=account.user.two_factor_enabled,
            monthly_goal=0.0,
            multiple_workplaces=account.user.multiple_workplaces,
            role="staff",
            created_at=target_obj.created_at,
            updated_at=target_obj.updated_at
        )

    return target_obj
