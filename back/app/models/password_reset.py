import sqlalchemy as sa

from app.database import Base


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id"), nullable=False)
    code = sa.Column(sa.String(6), nullable=False)
    expires_at = sa.Column(sa.DateTime, nullable=False)
    used = sa.Column(sa.Boolean, default=False, nullable=False)
    created_at = sa.Column(sa.DateTime, server_default=sa.func.now(), nullable=False)
