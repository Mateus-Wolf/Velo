from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.models.appointment import Appointment
from app.schemas.notification import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)

from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/notifications", tags=["Notificações"])


@router.get(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Obter preferências de notificação",
)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna as preferências de notificação do usuário logado."""
    pref = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .first()
    )
    if not pref:
        # Retornar defaults (tudo desativado)
        return NotificationPreferenceResponse()
    return pref


@router.put(
    "/preferences",
    response_model=NotificationPreferenceResponse,
    summary="Atualizar preferências de notificação",
)
def update_preferences(
    data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza as preferências de notificação do usuário logado.
    Cria o registro automaticamente se ainda não existir."""
    pref = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .first()
    )

    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)

    db.commit()
    db.refresh(pref)
    return pref


# ------------------------------------------------------------------ #
#  In-app (browser) notifications                                      #
# ------------------------------------------------------------------ #
NOTIFICATION_WINDOWS = {
    "30min": timedelta(minutes=30),
    "1day": timedelta(days=1),
    "2days": timedelta(days=2),
}


@router.get(
    "/pending",
    summary="Retorna notificações pendentes para exibição no browser",
)
def get_pending_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calcula quais agendamentos devem gerar alerta in-app agora."""
    now = datetime.now()
    today = now.date()
    end_date = today + timedelta(days=2)

    # Preferências do user
    pref = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .first()
    )
    if not pref:
        return []

    active_types = []
    if pref.notify_30_min_before:
        active_types.append("30min")
    if pref.notify_1_day_before:
        active_types.append("1day")
    if pref.notify_2_days_before:
        active_types.append("2days")

    if not active_types:
        return []

    # Agendamentos ativos de hoje até +2 dias
    appointments = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.workplace),
        )
        .filter(
            Appointment.user_id == current_user.id,
            Appointment.date >= today,
            Appointment.date <= end_date,
            Appointment.status.in_(["scheduled", "rescheduled"]),
        )
        .all()
    )

    # Log de browser já enviados
    sent_logs = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.notification_type.like("%_browser"),
            NotificationLog.appointment_id.in_([a.id for a in appointments]) if appointments else False,
        )
        .all()
    )
    sent_set = {(log.appointment_id, log.notification_type) for log in sent_logs}

    pending = []
    for appt in appointments:
        appt_datetime = datetime.combine(appt.date, appt.start_time)
        if appt_datetime < now:
            continue

        for notif_type in active_types:
            browser_type = f"{notif_type}_browser"
            window = NOTIFICATION_WINDOWS[notif_type]
            trigger_at = appt_datetime - window

            if trigger_at > now:
                continue
            if (appt.id, browser_type) in sent_set:
                continue

            client_name = appt.client.name if appt.client else f"Cliente #{appt.client_id}"
            workplace_name = appt.workplace.name if appt.workplace else f"Local #{appt.workplace_id}"

            pending.append({
                "appointment_id": appt.id,
                "notification_type": browser_type,
                "client_name": client_name,
                "workplace_name": workplace_name,
                "date": appt.date.strftime("%d/%m/%Y"),
                "time": appt.start_time.strftime("%H:%M"),
            })

    return pending


@router.post(
    "/mark-seen",
    summary="Marca notificações do browser como vistas",
)
def mark_seen(
    items: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra no log que as notificações foram exibidas no browser."""
    for item in items:
        appt_id = item.get("appointment_id")
        notif_type = item.get("notification_type")
        if not appt_id or not notif_type:
            continue

        exists = (
            db.query(NotificationLog)
            .filter(
                NotificationLog.appointment_id == appt_id,
                NotificationLog.notification_type == notif_type,
            )
            .first()
        )
        if not exists:
            db.add(NotificationLog(
                appointment_id=appt_id,
                notification_type=notif_type,
            ))

    db.commit()
    return {"message": "ok"}


# ------------------------------------------------------------------ #
#  Central de Notificações — Histórico                                 #
# ------------------------------------------------------------------ #

@router.get(
    "/history",
    summary="Histórico de notificações do usuário",
)
def get_notification_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna as últimas 50 notificações do usuário com dados do agendamento."""
    logs = (
        db.query(NotificationLog)
        .join(Appointment, NotificationLog.appointment_id == Appointment.id)
        .options(
            joinedload(NotificationLog.appointment)
            .joinedload(Appointment.client),
            joinedload(NotificationLog.appointment)
            .joinedload(Appointment.workplace),
        )
        .filter(Appointment.user_id == current_user.id)
        .order_by(NotificationLog.sent_at.desc())
        .limit(50)
        .all()
    )

    result = []
    for log in logs:
        appt = log.appointment
        client_name = appt.client.name if appt.client else f"Cliente #{appt.client_id}"
        workplace_name = appt.workplace.name if appt.workplace else f"Local #{appt.workplace_id}"

        result.append({
            "id": log.id,
            "notification_type": log.notification_type,
            "is_read": log.is_read,
            "sent_at": log.sent_at.isoformat() if log.sent_at else None,
            "appointment_id": appt.id,
            "client_name": client_name,
            "workplace_name": workplace_name,
            "date": appt.date.strftime("%d/%m/%Y"),
            "time": appt.start_time.strftime("%H:%M"),
            "status": appt.status,
        })

    return result


@router.get(
    "/unread-count",
    summary="Contagem de notificações não lidas",
)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna a quantidade de notificações não lidas do usuário."""
    count = (
        db.query(NotificationLog)
        .join(Appointment, NotificationLog.appointment_id == Appointment.id)
        .filter(
            Appointment.user_id == current_user.id,
            NotificationLog.is_read == False,  # noqa: E712
        )
        .count()
    )
    return {"count": count}


@router.patch(
    "/read-all",
    summary="Marcar todas as notificações como lidas",
)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca todas as notificações do usuário como lidas."""
    # Buscar IDs de notificações não lidas do usuário
    unread_ids = (
        db.query(NotificationLog.id)
        .join(Appointment, NotificationLog.appointment_id == Appointment.id)
        .filter(
            Appointment.user_id == current_user.id,
            NotificationLog.is_read == False,  # noqa: E712
        )
        .all()
    )
    if unread_ids:
        ids = [r[0] for r in unread_ids]
        db.query(NotificationLog).filter(
            NotificationLog.id.in_(ids)
        ).update({NotificationLog.is_read: True}, synchronize_session=False)
        db.commit()

    return {"message": "ok"}


# =============================================
# TEMPORÁRIO — Endpoint de teste de notificação
# Remover em produção
# =============================================
@router.post(
    "/test-send",
    summary="[TEMP] Dispara o scheduler de notificações manualmente",
)
def test_send_notifications(
    current_user: User = Depends(get_current_user),
):
    """Executa o scheduler de notificações imediatamente (para testes)."""
    from app.services.notification_scheduler import check_and_send_notifications
    check_and_send_notifications()
    return {"message": "Scheduler executado! Verifique os logs do terminal."}


