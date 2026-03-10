"""Serviço de Push Notifications via Firebase Cloud Messaging.

Inicializa o Firebase Admin SDK e expõe funções para enviar
notificações push para os dispositivos registrados de um usuário.
"""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger("mindflow.push")

# ------------------------------------------------------------------ #
#  Firebase Admin SDK — inicialização lazy                            #
# ------------------------------------------------------------------ #
_firebase_app = None


def _get_firebase_app():
    """Inicializa o Firebase Admin SDK apenas uma vez (lazy)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    creds_json = settings.FIREBASE_CREDENTIALS_JSON
    if not creds_json:
        logger.warning(
            "⚠️  FIREBASE_CREDENTIALS_JSON não configurado — push notifications desabilitadas"
        )
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials

        creds_dict = json.loads(creds_json)
        cred = credentials.Certificate(creds_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("✅ Firebase Admin SDK inicializado")
        return _firebase_app
    except Exception:
        logger.exception("❌ Falha ao inicializar Firebase Admin SDK")
        return None


def send_push_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """Envia push notification para todos os dispositivos de um usuário.

    Returns:
        Número de pushes enviados com sucesso.
    """
    app = _get_firebase_app()
    if app is None:
        return 0

    from firebase_admin import messaging
    from app.models.push_subscription import PushSubscription

    # Buscar todos os tokens do usuário
    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id)
        .all()
    )

    if not subscriptions:
        return 0

    sent_count = 0
    stale_tokens = []

    for sub in subscriptions:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=sub.fcm_token,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/logo.png",
                    badge="/favicon.png",
                    vibrate=[100, 50, 100],
                ),
            ),
        )

        try:
            messaging.send(message)
            sent_count += 1
        except messaging.UnregisteredError:
            # Token inválido ou expirado — marcar para remoção
            stale_tokens.append(sub.id)
            logger.info("🗑️  Token expirado removido (user_id=%d)", user_id)
        except Exception:
            logger.exception(
                "❌ Falha ao enviar push para token (user_id=%d)", user_id
            )

    # Limpar tokens inválidos
    if stale_tokens:
        db.query(PushSubscription).filter(
            PushSubscription.id.in_(stale_tokens)
        ).delete(synchronize_session=False)
        db.commit()

    return sent_count
