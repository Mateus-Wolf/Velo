from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services import client_service

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os clientes do usuário."""
    return client_service.list_clients(db, current_user.id, name=name)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca um cliente pelo ID."""
    return client_service.get_client(db, client_id, current_user.id)


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo cliente."""
    return client_service.create_client(db, current_user.id, data)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um cliente."""
    return client_service.update_client(db, client_id, current_user.id, data)


@router.post("/{client_id}/link/{workplace_id}", status_code=status.HTTP_201_CREATED)
def link_to_workplace(
    client_id: int,
    workplace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vincula um cliente a um local de trabalho."""
    return client_service.link_client_to_workplace(db, client_id, workplace_id, current_user.id)


@router.delete("/{client_id}/link/{workplace_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_from_workplace(
    client_id: int,
    workplace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove o vínculo entre cliente e local de trabalho."""
    client_service.unlink_client_from_workplace(db, client_id, workplace_id, current_user.id)
