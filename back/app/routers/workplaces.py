from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_account, require_admin, CurrentAccount
from app.models.user import User
from app.schemas.workplace import WorkplaceCreate, WorkplaceUpdate, WorkplaceResponse
from app.schemas.client import ClientResponse, ClientCreate
from app.services import workplace_service
from app.services import client_service

router = APIRouter(prefix="/workplaces", tags=["Locais de Trabalho"])


@router.get("/", response_model=list[WorkplaceResponse])
def list_workplaces(
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Lista todos os locais de trabalho do usuário.
    Staff só vê os workplaces que lhe foram concedidos."""
    workplaces = workplace_service.list_workplaces(db, account.user.id, name=name)
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        workplaces = [w for w in workplaces if w.id in allowed_ids]
    return workplaces


@router.get("/{workplace_id}", response_model=WorkplaceResponse)
def get_workplace(
    workplace_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Busca um local de trabalho pelo ID."""
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        if workplace_id not in allowed_ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este local de trabalho")
    return workplace_service.get_workplace(db, workplace_id, account.user.id)


@router.get("/{workplace_id}/clients", response_model=list[ClientResponse])
def list_workplace_clients(
    workplace_id: int,
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Lista os clientes vinculados a um local de trabalho."""
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        if workplace_id not in allowed_ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este local de trabalho")
    return workplace_service.list_workplace_clients(db, workplace_id, account.user.id, name=name)


@router.post("/{workplace_id}/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_workplace_client(
    workplace_id: int,
    data: ClientCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Cria um cliente e já vincula ao local de trabalho."""
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        if workplace_id not in allowed_ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este local de trabalho")

    new_client = client_service.create_client(db, account.user.id, data)
    client_service.link_client_to_workplace(db, new_client.id, workplace_id, account.user.id)

    # Notificar admin se ação feita por staff
    if account.role == "staff":
        _notify_admin_new_client(account, new_client.name)

    return new_client


@router.post("/", response_model=WorkplaceResponse, status_code=status.HTTP_201_CREATED)
def create_workplace(
    data: WorkplaceCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Cria um novo local de trabalho. Somente admin."""
    return workplace_service.create_workplace(db, account.user.id, data)


@router.put("/{workplace_id}", response_model=WorkplaceResponse)
def update_workplace(
    workplace_id: int,
    data: WorkplaceUpdate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Atualiza um local de trabalho. Somente admin."""
    return workplace_service.update_workplace(db, workplace_id, account.user.id, data)


@router.delete("/{workplace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workplace(
    workplace_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Remove (soft delete) um local de trabalho. Somente admin."""
    workplace_service.delete_workplace(db, workplace_id, account.user.id)


def _notify_admin_new_client(account: CurrentAccount, client_name: str):
    """Envia email ao admin notificando que staff cadastrou um cliente."""
    try:
        from app.services.email_service import send_email
        from app.services.email_templates import staff_action_notification_html
        html = staff_action_notification_html(
            admin_name=account.user.name,
            staff_name=account.staff.name,
            action=f"cadastrou o cliente <strong>{client_name}</strong>",
        )
        send_email(
            to=account.user.email,
            subject=f"📋 Velo — {account.staff.name} cadastrou um novo cliente",
            html_body=html,
        )
    except Exception:
        import logging
        logging.getLogger("velo.rbac").error("Falha ao notificar admin sobre novo cliente", exc_info=True)
