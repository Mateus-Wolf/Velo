from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.appointment import Appointment
from app.models.review import Review
from app.auth.security import decode_appointment_token
from app.schemas.appointment import ReviewCreate, ReviewResponse

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
    
    # Validar versão do token (invalidar links antigos quando preço muda)
    token_version = payload.get("tv", 1)
    if token_version != appointment.confirmation_token_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link não é mais válido. Um email mais recente foi enviado com as informações atualizadas.",
        )
    
    if appointment.status in ("canceled_client", "canceled_user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agendamento já foi cancelado.")
        
    appointment.status = "confirmed"
    appointment.rescheduled = False  # Resetar flag ao confirmar
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
    
    # Validar versão do token (invalidar links antigos quando preço muda)
    token_version = payload.get("tv", 1)
    if token_version != appointment.confirmation_token_version:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este link não é mais válido. Um email mais recente foi enviado com as informações atualizadas.",
        )
        
    appointment.status = "canceled_client"
    db.commit()
    
    return {"message": "Agendamento cancelado com sucesso!"}


@router.post("/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_public_review(token: str, body: ReviewCreate, db: Session = Depends(get_db)):
    """Envia uma avaliação usando um token JWT."""
    payload = decode_appointment_token(token)
    if not payload or payload.get("action") != "review":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado.")
        
    appointment_id = int(payload.get("sub"))
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado.")
        
    if appointment.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apenas agendamentos concluídos podem ser avaliados.")
        
    # Check if a review already exists
    existing = db.query(Review).filter(Review.appointment_id == appointment_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este agendamento já possui avaliação.")
        
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A nota deve ser entre 1 e 5.")
        
    review = Review(
        appointment_id=appointment_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
