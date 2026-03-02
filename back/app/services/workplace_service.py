from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.workplace import Workplace
from app.models.client import Client
from app.models.workplace_client import WorkplaceClient
from app.schemas.workplace import WorkplaceCreate, WorkplaceUpdate


def list_workplaces(db: Session, user_id: int, name: Optional[str] = None) -> List[Workplace]:
    """Lista locais de trabalho do usuário, com filtro opcional por nome."""
    query = db.query(Workplace).filter(
        Workplace.user_id == user_id,
        Workplace.is_active == True,
    )
    if name:
        query = query.filter(Workplace.name.ilike(f"%{name}%"))
    return query.all()


def get_workplace(db: Session, workplace_id: int, user_id: int) -> Workplace:
    """Busca um local pelo ID, garantindo que pertence ao usuário."""
    workplace = db.query(Workplace).filter(
        Workplace.id == workplace_id,
        Workplace.user_id == user_id,
    ).first()
    if not workplace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado")
    return workplace


def create_workplace(db: Session, user_id: int, data: WorkplaceCreate) -> Workplace:
    """Cria um novo local de trabalho."""
    workplace = Workplace(user_id=user_id, **data.model_dump())
    db.add(workplace)
    db.commit()
    db.refresh(workplace)
    return workplace


def update_workplace(db: Session, workplace_id: int, user_id: int, data: WorkplaceUpdate) -> Workplace:
    """Atualiza um local de trabalho existente."""
    workplace = get_workplace(db, workplace_id, user_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workplace, key, value)
    db.commit()
    db.refresh(workplace)
    return workplace


def delete_workplace(db: Session, workplace_id: int, user_id: int) -> None:
    """Soft delete de um local de trabalho."""
    workplace = get_workplace(db, workplace_id, user_id)
    workplace.is_active = False
    db.commit()


def list_workplace_clients(
    db: Session, workplace_id: int, user_id: int, name: Optional[str] = None
) -> List[Client]:
    """Lista os clientes vinculados a um local de trabalho."""
    # Garante que o local pertence ao usuário
    get_workplace(db, workplace_id, user_id)

    query = (
        db.query(Client)
        .join(WorkplaceClient, WorkplaceClient.client_id == Client.id)
        .filter(WorkplaceClient.workplace_id == workplace_id)
    )
    if name:
        query = query.filter(Client.name.ilike(f"%{name}%"))
    return query.order_by(Client.name).all()

