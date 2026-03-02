import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id"), nullable=False)
    workplace_id = sa.Column(sa.Integer, sa.ForeignKey("workplaces.id"), nullable=False)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.id"), nullable=False)
    date = sa.Column(sa.Date, nullable=False, index=True)
    start_time = sa.Column(sa.Time, nullable=False)
    end_time = sa.Column(sa.Time, nullable=False)
    recurrence_id = sa.Column(sa.String(50), nullable=True, index=True, doc="UUID agrupando consultas recorrentes")
    status = sa.Column(
        sa.String(20),
        nullable=False,
        default="scheduled",
        doc="Valores: scheduled, canceled, completed, confirmed, rescheduled",
    )
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamentos
    user = relationship("User", back_populates="appointments")
    workplace = relationship("Workplace", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    alerts = relationship("Alert", back_populates="appointment", lazy="selectin")
