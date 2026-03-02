from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.client import Client
from app.models.workplace_client import WorkplaceClient
from app.schemas.client import ClientCreate, ClientUpdate


def list_clients(db: Session, user_id: int, name: Optional[str] = None) -> List[Client]:
    """Lista clientes do usuário, com filtro opcional por nome."""
    query = db.query(Client).filter(Client.user_id == user_id)
    if name:
        query = query.filter(Client.name.ilike(f"%{name}%"))
    return query.order_by(Client.name).all()


def get_client(db: Session, client_id: int, user_id: int) -> Client:
    """Busca um cliente pelo ID, garantindo que pertence ao usuário."""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.user_id == user_id,
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return client


def create_client(db: Session, user_id: int, data: ClientCreate) -> Client:
    """Cria um novo cliente."""
    client = Client(user_id=user_id, **data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def update_client(db: Session, client_id: int, user_id: int, data: ClientUpdate) -> Client:
    """Atualiza um cliente existente."""
    client = get_client(db, client_id, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client


def link_client_to_workplace(db: Session, client_id: int, workplace_id: int, user_id: int) -> WorkplaceClient:
    """Vincula um cliente a um local de trabalho."""
    get_client(db, client_id, user_id)

    existing = db.query(WorkplaceClient).filter(
        WorkplaceClient.client_id == client_id,
        WorkplaceClient.workplace_id == workplace_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cliente já vinculado a este local",
        )

    link = WorkplaceClient(client_id=client_id, workplace_id=workplace_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def unlink_client_from_workplace(db: Session, client_id: int, workplace_id: int, user_id: int) -> None:
    """Remove o vínculo entre cliente e local de trabalho."""
    get_client(db, client_id, user_id)

    link = db.query(WorkplaceClient).filter(
        WorkplaceClient.client_id == client_id,
        WorkplaceClient.workplace_id == workplace_id,
    ).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vínculo não encontrado",
        )
    db.delete(link)
    db.commit()
