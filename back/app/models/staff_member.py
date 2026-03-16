import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class StaffMember(Base):
    __tablename__ = "staff_members"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    admin_user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id"), nullable=False)
    name = sa.Column(sa.String(255), nullable=False)
    email = sa.Column(sa.String(255), unique=True, nullable=False, index=True)
    password_hash = sa.Column(sa.String(255), nullable=False)
    can_change_status = sa.Column(sa.Boolean, default=False, nullable=False,
                                  doc="Se True, o staff pode alterar status de agendamentos")
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    avatar_url = sa.Column(sa.String(500), nullable=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )

    # Relacionamentos
    admin = relationship("User", backref="staff_members")
    workplace_access = relationship("StaffWorkplaceAccess", back_populates="staff_member",
                                     cascade="all, delete-orphan", lazy="selectin")
