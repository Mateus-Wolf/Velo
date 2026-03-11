import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    appointment_id = sa.Column(
        sa.Integer, sa.ForeignKey("appointments.id"), nullable=False, unique=True,
        doc="Relacionamento 1:1 com agendamento",
    )
    rating = sa.Column(sa.Integer, nullable=False, doc="Nota de 1 a 5 estrelas")
    comment = sa.Column(sa.Text, nullable=True, doc="Comentário opcional do cliente")
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamento
    appointment = relationship("Appointment", back_populates="review")
