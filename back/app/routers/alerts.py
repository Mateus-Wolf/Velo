from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["Alertas"])


@router.get("/appointment/{appointment_id}", response_model=list[AlertResponse])
def list_alerts(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista alertas de um agendamento."""
    return alert_service.list_alerts_by_appointment(db, appointment_id)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo alerta."""
    return alert_service.create_alert(db, data)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove um alerta."""
    alert_service.delete_alert(db, alert_id)
