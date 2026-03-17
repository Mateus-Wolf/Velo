from typing import Optional
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import decode_access_token
from app.models.user import User
from app.models.staff_member import StaffMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass
class CurrentAccount:
    """Representa a conta autenticada — pode ser admin ou staff."""
    user: User  # Sempre o admin (dono dos dados)
    role: str = "admin"  # "admin" ou "staff"
    staff: Optional[StaffMember] = None  # Preenchido se for staff
    permissions: dict = field(default_factory=dict)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency que extrai o usuário autenticado a partir do JWT.
    Se for staff, retorna o admin (dono dos dados) para manter compatibilidade."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    role = payload.get("role", "admin")

    if role == "staff":
        # Staff: retorna o admin associado
        staff_id = payload.get("staff_id")
        admin_id = payload.get("admin_id")
        if not staff_id or not admin_id:
            raise credentials_exception

        staff = db.query(StaffMember).filter(
            StaffMember.id == int(staff_id),
            StaffMember.is_active == True,
        ).first()
        if not staff:
            raise credentials_exception

        user = db.query(User).filter(User.id == int(admin_id)).first()
        if not user:
            raise credentials_exception
        return user
    else:
        # Admin normal
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise credentials_exception
        return user


def get_current_account(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> CurrentAccount:
    """Dependency que retorna informações completas da conta (user + role + staff + permissions)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    role = payload.get("role", "admin")

    if role == "staff":
        staff_id = payload.get("staff_id")
        admin_id = payload.get("admin_id")
        if not staff_id or not admin_id:
            raise credentials_exception

        staff = db.query(StaffMember).filter(
            StaffMember.id == int(staff_id),
            StaffMember.is_active == True,
        ).first()
        if not staff:
            raise credentials_exception

        user = db.query(User).filter(User.id == int(admin_id)).first()
        if not user:
            raise credentials_exception

        # Montar lista de workplace_ids permitidos
        # Usamos uma query direta ou garantimos que workplace_access está carregado
        allowed_wp_ids = [wa.workplace_id for wa in staff.workplace_access]

        return CurrentAccount(
            user=user,
            role="staff",
            staff=staff,
            permissions={
                "can_change_status": staff.can_change_status,
                "can_access_documents": staff.can_access_documents,
                "allowed_workplace_ids": allowed_wp_ids,
            },
        )
    else:
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise credentials_exception

        return CurrentAccount(user=user, role="admin")


def require_admin(
    account: CurrentAccount = Depends(get_current_account),
) -> CurrentAccount:
    """Dependency que exige role=admin. Retorna 403 para staff."""
    if account.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao administrador",
        )
    return account
