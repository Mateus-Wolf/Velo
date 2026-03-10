import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    name = sa.Column(sa.String(255), nullable=False)
    email = sa.Column(sa.String(255), unique=True, nullable=False, index=True)
    password_hash = sa.Column(sa.String(255), nullable=False)
    avatar_url = sa.Column(sa.String(500), nullable=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )
    # Retorna o status de criação para a data de expiração, ou null
    two_factor_enabled = sa.Column(sa.Boolean, default=False, nullable=False)
    two_factor_code = sa.Column(sa.String(10), nullable=True)
    two_factor_expires_at = sa.Column(sa.DateTime(timezone=True), nullable=True)
    monthly_goal = sa.Column(sa.Float, default=0.0, nullable=False)

    # Relacionamentos
    workplaces = relationship("Workplace", back_populates="user", lazy="selectin")
    clients = relationship("Client", back_populates="user", lazy="selectin")
    appointments = relationship("Appointment", back_populates="user", lazy="selectin")
    recognized_devices = relationship("RecognizedDevice", back_populates="user", lazy="selectin")
