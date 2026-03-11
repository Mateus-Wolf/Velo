from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.appointment import Appointment
from app.models.review import Review
from app.schemas.appointment import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/appointments", tags=["Avaliações"])


@router.post("/{appointment_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    appointment_id: int,
    body: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma avaliação para um agendamento concluído."""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    if appointment.status != "completed":
        raise HTTPException(status_code=400, detail="Apenas agendamentos concluídos podem ser avaliados")

    existing = db.query(Review).filter(Review.appointment_id == appointment_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Este agendamento já possui avaliação")

    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=400, detail="A nota deve ser entre 1 e 5")

    review = Review(
        appointment_id=appointment_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/{appointment_id}/review", response_model=ReviewResponse)
def get_review(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Busca a avaliação de um agendamento."""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == current_user.id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    review = db.query(Review).filter(Review.appointment_id == appointment_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return review
