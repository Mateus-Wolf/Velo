import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id"), nullable=False)
    name = sa.Column(sa.String(255), nullable=False)
    email = sa.Column(sa.String(255), nullable=True)
    contact = sa.Column(sa.String(255), nullable=True)
    notes = sa.Column(sa.Text, nullable=True)
    category = sa.Column(sa.String(50), default="client", nullable=False, doc="client ou patient")
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamentos
    user = relationship("User", back_populates="clients")
    workplace_clients = relationship("WorkplaceClient", back_populates="client", lazy="selectin")
    appointments = relationship("Appointment", back_populates="client", lazy="selectin")
