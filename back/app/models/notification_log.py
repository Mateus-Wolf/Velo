import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    appointment_id = sa.Column(
        sa.Integer, sa.ForeignKey("appointments.id"), nullable=False
    )
    notification_type = sa.Column(
        sa.String(30), nullable=False,
        doc="Tipo: '30min', '1day', '2days', '30min_browser', etc.",
    )
    is_read = sa.Column(
        sa.Boolean, nullable=False, default=False,
        doc="Se o usuário já leu a notificação na central",
    )
    sent_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )

    # Índices compostos para performance e unicidade
    __table_args__ = (
        sa.UniqueConstraint("appointment_id", "notification_type", name="uq_appt_notif_type"),
        sa.Index("ix_notif_log_appt_read", "appointment_id", "is_read"),
    )

    # Relacionamento
    appointment = relationship("Appointment")

