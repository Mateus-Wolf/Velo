import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(
        sa.Integer, sa.ForeignKey("users.id"), nullable=False, unique=True
    )
    notify_30_min_before = sa.Column(sa.Boolean, default=False, nullable=False)
    notify_1_day_before = sa.Column(sa.Boolean, default=False, nullable=False)
    notify_2_days_before = sa.Column(sa.Boolean, default=False, nullable=False)

    # Relacionamento
    user = relationship("User", backref="notification_preference")
