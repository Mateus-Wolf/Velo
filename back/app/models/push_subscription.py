import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(
        sa.Integer, sa.ForeignKey("users.id"), nullable=False
    )
    fcm_token = sa.Column(sa.String(512), nullable=False, unique=True)
    device_info = sa.Column(sa.String(255), nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )

    # Relacionamento
    user = relationship("User", backref="push_subscriptions")
