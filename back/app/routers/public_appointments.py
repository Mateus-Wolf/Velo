from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment
from app.auth.security import decode_appointment_token

router = APIRouter(prefix="/public/appointments", tags=["Public Agendamentos"])

@router.post("/confirm")
def confirm_appointment(token: str, db: Session = Depends(get_db)):
    """Confirma um agendamento usando um token JWT enviado por email."""
    payload = decode_appointment_token(token)
    if not payload or payload.get("action") != "confirm":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado.")
    
    appointment_id = int(payload.get("sub"))
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado.")
    
    if appointment.status == "canceled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agendamento já foi cancelado.")
        
    appointment.status = "confirmed"
    db.commit()
    
    return {"message": "Agendamento confirmado com sucesso!"}


@router.post("/cancel")
def cancel_appointment(token: str, db: Session = Depends(get_db)):
    """Cancela um agendamento usando um token JWT enviado por email."""
    payload = decode_appointment_token(token)
    if not payload or payload.get("action") != "cancel":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado.")
    
    appointment_id = int(payload.get("sub"))
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado.")
        
    appointment.status = "canceled"
    db.commit()
    
    return {"message": "Agendamento cancelado com sucesso!"}
