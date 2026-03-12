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
        sa.String(30),
        nullable=False,
        default="scheduled",
        index=True,
        doc="Valores: scheduled, confirmed, completed, pending, canceled_client, canceled_user, no_show",
    )
    rescheduled = sa.Column(
        sa.Boolean, nullable=False, default=False,
        doc="Flag indicando que a data/hora foi alterada. Resetado após confirmação.",
    )
    price = sa.Column(sa.Numeric(10, 2), nullable=True, doc="Preço estimado do atendimento")
    paid_value = sa.Column(sa.Numeric(10, 2), nullable=True, doc="Valor efetivamente pago pelo cliente")
    payment_method = sa.Column(
        sa.String(20), nullable=True,
        doc="Método de pagamento: pix, credit, debit, boleto, cash, free",
    )
    installments = sa.Column(sa.Integer, nullable=True, doc="Número de parcelas (para crédito)")
    confirmation_token_version = sa.Column(
        sa.Integer, nullable=False, default=1,
        doc="Versão do token de confirmação; incrementada ao alterar preço antes de confirmar",
    )
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Índices compostos para performance
    __table_args__ = (
        sa.Index("ix_appointments_user_status", "user_id", "status"),
        sa.Index("ix_appointments_user_date", "user_id", "date"),
        sa.Index("ix_appointments_workplace_date_status", "workplace_id", "date", "status"),
    )

    # Relacionamentos
    user = relationship("User", back_populates="appointments")
    workplace = relationship("Workplace", back_populates="appointments")
    client = relationship("Client", back_populates="appointments")
    alerts = relationship("Alert", back_populates="appointment", lazy="selectin")
    review = relationship("Review", back_populates="appointment", uselist=False, lazy="selectin")
