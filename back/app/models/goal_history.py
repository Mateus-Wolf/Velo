import sqlalchemy as sa
from app.database import Base


class GoalHistory(Base):
    __tablename__ = "goal_history"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_value = sa.Column(sa.Float, nullable=False)
    achieved = sa.Column(sa.Boolean, default=False, nullable=False)
    revenue_at_close = sa.Column(sa.Float, default=0.0, nullable=False)
    month_ref = sa.Column(sa.String(10), nullable=False)  # e.g. "Mar/26"
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
