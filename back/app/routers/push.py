from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.push_subscription import PushSubscription

router = APIRouter(prefix="/push", tags=["Push Notifications"])


# ---------- Schemas ----------

class PushSubscribeRequest(BaseModel):
    token: str
    device_info: Optional[str] = None


class PushUnsubscribeRequest(BaseModel):
    token: str


# ---------- Endpoints ----------

@router.post(
    "/subscribe",
    summary="Registrar token FCM para push notifications",
)
def subscribe(
    data: PushSubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Salva o token FCM do dispositivo. Se o token já existir para
    outro usuário, atualiza o vínculo (um token pertence a um dispositivo)."""

    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.fcm_token == data.token)
        .first()
    )

    if existing:
        # Atualizar para o usuário atual (troca de conta no mesmo device)
        existing.user_id = current_user.id
        existing.device_info = data.device_info
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            fcm_token=data.token,
            device_info=data.device_info,
        )
        db.add(sub)

    db.commit()
    return {"message": "Push subscription registrada com sucesso"}


@router.delete(
    "/unsubscribe",
    summary="Remover token FCM de push notifications",
)
def unsubscribe(
    data: PushUnsubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove o token FCM do dispositivo."""
    db.query(PushSubscription).filter(
        PushSubscription.fcm_token == data.token,
        PushSubscription.user_id == current_user.id,
    ).delete()
    db.commit()
    return {"message": "Push subscription removida"}
