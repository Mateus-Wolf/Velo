import sqlalchemy as sa
from sqlalchemy.orm import relationship
from app.database import Base

class ConsentForm(Base):
    __tablename__ = "consent_forms"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.id"), nullable=False, index=True)
    appointment_id = sa.Column(sa.Integer, sa.ForeignKey("appointments.id"), nullable=True, index=True)
    
    title = sa.Column(sa.String(255), nullable=False)
    content = sa.Column(sa.Text, nullable=False)
    signature_data = sa.Column(sa.Text, nullable=True, doc="Representação da assinatura (SVG ou Base64)")
    signed_at = sa.Column(sa.DateTime(timezone=True), nullable=True)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamentos
    client = relationship("Client", backref="consent_forms")
    appointment = relationship("Appointment", backref="consent_form")
