import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class StaffWorkplaceAccess(Base):
    __tablename__ = "staff_workplace_access"

    staff_member_id = sa.Column(
        sa.Integer, sa.ForeignKey("staff_members.id", ondelete="CASCADE"),
        primary_key=True,
    )
    workplace_id = sa.Column(
        sa.Integer, sa.ForeignKey("workplaces.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Relacionamentos
    staff_member = relationship("StaffMember", back_populates="workplace_access")
    workplace = relationship("Workplace")
