import os
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.schemas.password_reset import MessageResponse

router = APIRouter(prefix="/profile", tags=["Perfil"])

AVATARS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "avatars")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.get("/", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retorna dados do perfil do usuário autenticado."""
    return current_user


@router.put("/", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza nome e/ou email do usuário."""
    update_data = data.model_dump(exclude_unset=True)

    # Verificar email único
    if "email" in update_data and update_data["email"] != current_user.email:
        existing = db.query(User).filter(User.email == update_data["email"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este email já está em uso",
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
    current_user: User = Depends(get_current_user),
):
    """Altera a senha do usuário (exige senha atual)."""
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
    current_user: User = Depends(get_current_user),
):
    """Upload de foto de perfil."""
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
    if current_user.avatar_url:
        old_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            current_user.avatar_url.lstrip("/"),
        )
        if os.path.exists(old_path):
            os.remove(old_path)

    # Salvar novo arquivo
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(AVATARS_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Atualizar URL no banco
    current_user.avatar_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/avatar", response_model=UserResponse)
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a foto de perfil."""
    if current_user.avatar_url:
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            current_user.avatar_url.lstrip("/"),
        )
        if os.path.exists(filepath):
            os.remove(filepath)

        current_user.avatar_url = None
        db.commit()
        db.refresh(current_user)

    return current_user
