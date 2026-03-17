import sqlalchemy as sa
from sqlalchemy.orm import relationship
from app.database import Base

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.id"), nullable=False, index=True)
    appointment_id = sa.Column(sa.Integer, sa.ForeignKey("appointments.id"), nullable=True, index=True)
    
    type = sa.Column(sa.String(20), nullable=False, index=True, doc="anamnesis ou evolution")
    content = sa.Column(sa.Text, nullable=False)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())

    # Relacionamentos
    client = relationship("Client", backref="medical_records")
    appointment = relationship("Appointment", backref="medical_record")
    attachments = relationship("Attachment", back_populates="medical_record", cascade="all, delete-orphan")
