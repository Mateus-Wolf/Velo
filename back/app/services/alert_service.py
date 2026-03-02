from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.alert import Alert
from app.schemas.alert import AlertCreate


def list_alerts_by_appointment(db: Session, appointment_id: int) -> list[Alert]:
    """Lista todos os alertas de um agendamento."""
    return db.query(Alert).filter(Alert.appointment_id == appointment_id).all()


def create_alert(db: Session, data: AlertCreate) -> Alert:
    """Cria um novo alerta para um agendamento."""
    alert = Alert(**data.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def delete_alert(db: Session, alert_id: int) -> None:
    """Remove um alerta."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta não encontrado")
    db.delete(alert)
    db.commit()
