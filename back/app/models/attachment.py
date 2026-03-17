import sqlalchemy as sa
from sqlalchemy.orm import relationship
from app.database import Base

class Attachment(Base):
    __tablename__ = "medical_attachments"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    medical_record_id = sa.Column(sa.Integer, sa.ForeignKey("medical_records.id"), nullable=False, index=True)
    
    file_path = sa.Column(sa.String(500), nullable=False)
    file_type = sa.Column(sa.String(50), nullable=True, doc="image/jpeg, application/pdf, etc")
    label = sa.Column(sa.String(100), nullable=True, doc="Antes, Depois, Exame, etc")
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamentos
    medical_record = relationship("MedicalRecord", back_populates="attachments")
