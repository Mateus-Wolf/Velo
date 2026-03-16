import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class Workplace(Base):
    __tablename__ = "workplaces"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id"), nullable=False)
    name = sa.Column(sa.String(255), nullable=False)
    description = sa.Column(sa.Text, nullable=True)
    photo_url = sa.Column(sa.Text, nullable=True)
    address = sa.Column(sa.String(500), nullable=True)
    cep = sa.Column(sa.String(20), nullable=True)
    number = sa.Column(sa.String(100), nullable=True)
    work_days = sa.Column(sa.String(50), nullable=False, doc="Dias da semana, ex: '1,2,3,4,5'")
    start_time = sa.Column(sa.Time, nullable=False)
    end_time = sa.Column(sa.Time, nullable=False)
    break_start_time = sa.Column(sa.Time, nullable=True)
    break_end_time = sa.Column(sa.Time, nullable=True)
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    works_on_holidays = sa.Column(sa.Boolean, default=False, nullable=False)
    buffer_time = sa.Column(sa.Integer, default=0, nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())

    # Relacionamentos
    user = relationship("User", back_populates="workplaces")
    workplace_clients = relationship("WorkplaceClient", back_populates="workplace", lazy="selectin")
    appointments = relationship("Appointment", back_populates="workplace", lazy="selectin")
