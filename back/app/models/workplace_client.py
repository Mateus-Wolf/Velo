import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class WorkplaceClient(Base):
    __tablename__ = "workplace_clients"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    workplace_id = sa.Column(sa.Integer, sa.ForeignKey("workplaces.id"), nullable=False)
    client_id = sa.Column(sa.Integer, sa.ForeignKey("clients.id"), nullable=False)

    # Constraint para evitar duplicatas
    __table_args__ = (
        sa.UniqueConstraint("workplace_id", "client_id", name="uq_workplace_client"),
    )

    # Relacionamentos
    workplace = relationship("Workplace", back_populates="workplace_clients")
    client = relationship("Client", back_populates="workplace_clients")
