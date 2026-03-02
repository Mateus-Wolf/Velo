from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Agendamentos"])


@router.get("/", response_model=list[AppointmentResponse])
def list_appointments(
    workplace_id: Optional[int] = None,
    client_id: Optional[int] = None,
    appointment_date: Optional[date] = None,
    appointment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista agendamentos com filtros opcionais."""
    return appointment_service.list_appointments(
        db, current_user.id,
        workplace_id=workplace_id,
        client_id=client_id,
        appointment_date=appointment_date,
        appointment_status=appointment_status,
    )


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca um agendamento pelo ID."""
    return appointment_service.get_appointment(db, appointment_id, current_user.id)


@router.post("/", response_model=list[AppointmentResponse], status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria novos agendamentos (suporta vários via recorrência)."""
    return appointment_service.create_appointment(db, current_user.id, data, background_tasks)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um agendamento existente."""
    return appointment_service.update_appointment(db, appointment_id, current_user.id, data, background_tasks)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    cancel_all_future: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancela um agendamento (opcionalmente cancelando os futuros da recorrência)."""
    return appointment_service.cancel_appointment(db, appointment_id, current_user.id, cancel_all_future)
