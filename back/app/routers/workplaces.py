from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
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
    current_user: User = Depends(get_current_user),
):
    """Lista todos os locais de trabalho do usuário."""
    return workplace_service.list_workplaces(db, current_user.id, name=name)


@router.get("/{workplace_id}", response_model=WorkplaceResponse)
def get_workplace(
    workplace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca um local de trabalho pelo ID."""
    return workplace_service.get_workplace(db, workplace_id, current_user.id)


@router.get("/{workplace_id}/clients", response_model=list[ClientResponse])
def list_workplace_clients(
    workplace_id: int,
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista os clientes vinculados a um local de trabalho."""
    return workplace_service.list_workplace_clients(db, workplace_id, current_user.id, name=name)


@router.post("/{workplace_id}/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_workplace_client(
    workplace_id: int,
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um cliente e já vincula ao local de trabalho."""
    new_client = client_service.create_client(db, current_user.id, data)
    client_service.link_client_to_workplace(db, new_client.id, workplace_id, current_user.id)
    return new_client


@router.post("/", response_model=WorkplaceResponse, status_code=status.HTTP_201_CREATED)
def create_workplace(
    data: WorkplaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo local de trabalho."""
    return workplace_service.create_workplace(db, current_user.id, data)


@router.put("/{workplace_id}", response_model=WorkplaceResponse)
def update_workplace(
    workplace_id: int,
    data: WorkplaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um local de trabalho."""
    return workplace_service.update_workplace(db, workplace_id, current_user.id, data)


@router.delete("/{workplace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workplace(
    workplace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove (soft delete) um local de trabalho."""
    workplace_service.delete_workplace(db, workplace_id, current_user.id)

