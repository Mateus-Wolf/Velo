import sqlalchemy as sa
from sqlalchemy.orm import relationship

from app.database import Base


class RecognizedDevice(Base):
    """
    Registra os dispositivos que já validaram o 2FA com sucesso,
    para que não precise solicitar o código novamente por 30 dias.
    """
    __tablename__ = "recognized_devices"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = sa.Column(sa.String(255), nullable=False, index=True)
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now())
    expires_at = sa.Column(sa.DateTime(timezone=True), nullable=False)

    # Relacionamento de volta com User
    user = relationship("User", back_populates="recognized_devices")
