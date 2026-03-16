from typing import Optional

from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_account, CurrentAccount
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Lista todos os clientes do usuário (admin)."""
    return client_service.list_clients(db, account.user.id, name=name)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Busca um cliente pelo ID."""
    return client_service.get_client(db, client_id, account.user.id)


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Cria um novo cliente."""
    result = client_service.create_client(db, account.user.id, data)

    # Notificar admin se ação feita por staff
    if account.role == "staff":
        try:
            from app.services.email_service import send_email
            from app.services.email_templates import staff_action_notification_html
            html = staff_action_notification_html(
                admin_name=account.user.name,
                staff_name=account.staff.name,
                action=f"cadastrou o cliente <strong>{data.name}</strong>",
            )
            send_email(
                to=account.user.email,
                subject=f"📋 Velo — {account.staff.name} cadastrou um novo cliente",
                html_body=html,
            )
        except Exception:
            import logging
            logging.getLogger("velo.rbac").error("Falha ao notificar admin", exc_info=True)

    return result


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Atualiza um cliente."""
    return client_service.update_client(db, client_id, account.user.id, data)


@router.post("/{client_id}/link/{workplace_id}", status_code=status.HTTP_201_CREATED)
def link_to_workplace(
    client_id: int,
    workplace_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Vincula um cliente a um local de trabalho."""
    return client_service.link_client_to_workplace(db, client_id, workplace_id, account.user.id)


@router.delete("/{client_id}/link/{workplace_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_from_workplace(
    client_id: int,
    workplace_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Remove o vínculo entre cliente e local de trabalho."""
    client_service.unlink_client_from_workplace(db, client_id, workplace_id, account.user.id)
