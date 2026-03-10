"""Scheduler de notificações automáticas.

Executa periodicamente verificando agendamentos que precisam de notificação
e envia emails com base nas preferências de cada usuário.

Lógica:
  1. Busca agendamentos de hoje até daqui a 2 dias (status scheduled/rescheduled)
  2. Para cada agendamento, verifica as preferências do usuário
  3. Para cada preferência ativa, calcula se já é hora de enviar:
       hora_agendamento - janela <= agora  →  enviar (se não enviou antes)
"""

import logging
from datetime import datetime, timedelta, date as dt_date, time as dt_time

from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models.appointment import Appointment
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.services.email_service import send_email
from app.services.email_templates import appointment_reminder

logger = logging.getLogger("mindflow.notifications")

# Mapeamento tipo → timedelta antes do agendamento
NOTIFICATION_WINDOWS = {
    "30min": timedelta(minutes=30),
    "1day": timedelta(days=1),
    "2days": timedelta(days=2),
}


def check_and_send_notifications() -> None:
    """Job principal: verifica e envia notificações pendentes."""
    db: Session = SessionLocal()
    try:
        _process_notifications(db)
    except Exception:
        logger.exception("Erro no scheduler de notificações")
    finally:
        db.close()


def _process_notifications(db: Session) -> None:
    """Lógica central do scheduler."""
    now = datetime.now()  # hora local (naive)
    today = now.date()
    end_date = today + timedelta(days=2)

    # 1. Buscar todos os agendamentos de hoje até +2 dias (ativos)
    appointments = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.client),
            joinedload(Appointment.workplace),
            joinedload(Appointment.user),
        )
        .filter(
            Appointment.date >= today,
            Appointment.date <= end_date,
            Appointment.status.in_(["scheduled", "rescheduled"]),
        )
        .all()
    )

    if not appointments:
        return

    # 2. Coletar user_ids únicos e buscar preferências
    user_ids = list({a.user_id for a in appointments})
    prefs_list = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id.in_(user_ids))
        .all()
    )
    prefs_map = {p.user_id: p for p in prefs_list}

    # 3. Para cada agendamento, verificar cada tipo de notificação
    for appt in appointments:
        pref = prefs_map.get(appt.user_id)
        if not pref:
            continue  # Sem preferências configuradas

        # Construir datetime completo do agendamento (naive local)
        appt_datetime = datetime.combine(appt.date, appt.start_time)

        # Se o agendamento já passou, ignorar
        if appt_datetime < now:
            continue

        active_types = []
        if pref.notify_30_min_before:
            active_types.append("30min")
        if pref.notify_1_day_before:
            active_types.append("1day")
        if pref.notify_2_days_before:
            active_types.append("2days")

        for notif_type in active_types:
            window = NOTIFICATION_WINDOWS[notif_type]
            trigger_at = appt_datetime - window  # Horário em que devemos enviar

            # Já é hora de enviar? (trigger_at <= now)
            if trigger_at > now:
                continue

            # Já foi enviado?
            already_sent = (
                db.query(NotificationLog.id)
                .filter(
                    NotificationLog.appointment_id == appt.id,
                    NotificationLog.notification_type == notif_type,
                )
                .first()
            )
            if already_sent:
                continue

            # Enviar!
            _send_notification(db, appt, notif_type)


def _send_notification(db: Session, appt, notif_type: str) -> None:
    """Envia email + push notification e registra no log."""
    user = appt.user
    client_name = appt.client.name if appt.client else f"Cliente #{appt.client_id}"
    workplace_name = appt.workplace.name if appt.workplace else f"Local #{appt.workplace_id}"
    appt_time = appt.start_time.strftime("%H:%M")
    appt_date = appt.date.strftime("%d/%m/%Y")

    html = appointment_reminder(
        user_name=user.name,
        client_name=client_name,
        time=appt_time,
        date=appt_date,
        workplace_name=workplace_name,
    )

    try:
        send_email(
            to=user.email,
            subject=f"🔔 MindFlow — Lembrete: agendamento com {client_name} às {appt_time}",
            html_body=html,
        )

        # Push notification
        from app.services.push_service import send_push_to_user
        send_push_to_user(
            db=db,
            user_id=user.id,
            title=f"🔔 Agendamento com {client_name}",
            body=f"{appt_date} às {appt_time} — {workplace_name}",
            data={
                "appointment_id": str(appt.id),
                "type": notif_type,
            },
        )

        # Registrar no log
        log = NotificationLog(
            appointment_id=appt.id,
            notification_type=notif_type,
        )
        db.add(log)
        db.commit()
        logger.info(
            "✅ Notificação '%s' enviada para %s (agendamento #%d — %s às %s)",
            notif_type, user.email, appt.id, appt_date, appt_time,
        )
    except Exception:
        logger.exception(
            "❌ Falha ao enviar notificação '%s' para %s (agendamento #%d)",
            notif_type, user.email, appt.id,
        )
