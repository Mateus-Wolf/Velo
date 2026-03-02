import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    appointment_id = sa.Column(sa.Integer, sa.ForeignKey("appointments.id"), nullable=False)
    alert_datetime = sa.Column(sa.DateTime(timezone=True), nullable=False)
    is_triggered = sa.Column(sa.Boolean, default=False, nullable=False)

    # Relacionamentos
    appointment = relationship("Appointment", back_populates="alerts")
