from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status, BackgroundTasks

from app.models.appointment import Appointment
from app.models.workplace import Workplace
from app.models.client import Client
from app.models.workplace_client import WorkplaceClient
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, VALID_PAYMENT_METHODS
from app.config import settings
from app.services.email_service import send_email
from app.services.email_templates import (
    appointment_confirmation_request_html,
    appointment_rescheduled_request_html,
    appointment_package_html,
    appointment_price_changed_html,
    appointment_completed_html,
)
from app.auth.security import create_appointment_token
from app.services.holiday_service import is_holiday
import uuid
import calendar
from datetime import timedelta

# Status que indicam que o agendamento não está mais ativo (não gera conflito)
INACTIVE_STATUSES = ["canceled_client", "canceled_user", "no_show", "completed"]


def _validate_resources(db: Session, user_id: int, data: Dict) -> Workplace:
    workplace = db.query(Workplace).filter(
        Workplace.id == data.get("workplace_id"), Workplace.user_id == user_id,
        Workplace.is_active == True,
    ).first()
    if not workplace:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    client = db.query(Client).filter(
        Client.id == data.get("client_id"), Client.user_id == user_id, Client.is_active == True,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if not db.query(WorkplaceClient).filter(
        WorkplaceClient.workplace_id == workplace.id, WorkplaceClient.client_id == client.id,
    ).first():
        raise HTTPException(status_code=400, detail="Cliente não vinculado ao local selecionado")
    return workplace


def _lock_schedule(db: Session, user_id: int):
    # Serializa alterações da agenda do profissional no PostgreSQL.
    db.query(User.id).filter(User.id == user_id).with_for_update().first()


def _invalidate_links(appointment: Appointment):
    appointment.confirmation_token_version = (appointment.confirmation_token_version or 1) + 1


def _validate_appointment(db: Session, user_id: int, data: Dict, exclude_id: Optional[int] = None) -> None:
    workplace = _validate_resources(db, user_id, data)
    appt_date, start_time, end_time = data["date"], data["start_time"], data["end_time"]
    if not appt_date or not start_time or not end_time or end_time <= start_time:
        raise HTTPException(status_code=400, detail="O horário final deve ser posterior ao inicial")
    start_dt = datetime.combine(appt_date, start_time)
    end_dt = datetime.combine(appt_date, end_time)
    if start_dt < datetime.now():
        raise HTTPException(status_code=400, detail="Não é permitido agendar no passado")
    if start_time < workplace.start_time or end_time > workplace.end_time:
        raise HTTPException(status_code=400, detail="Horário fora do expediente do local")
    if workplace.break_start_time and workplace.break_end_time:
        if max(start_time, workplace.break_start_time) < min(end_time, workplace.break_end_time):
            raise HTTPException(status_code=400, detail="Horário coincide com o intervalo do local")
    allowed_days = {int(d.strip()) % 7 for d in workplace.work_days.split(",")}
    if appt_date.isoweekday() % 7 not in allowed_days:
        raise HTTPException(status_code=400, detail="O local não funciona neste dia da semana")
    if not workplace.works_on_holidays and is_holiday(appt_date):
        raise HTTPException(status_code=400, detail="O local selecionado não possui expediente em feriados.")

    # Compara datetimes completos para preservar intervalos que atravessam meia-noite.
    # A sobreposição é sempre proibida, mesmo com buffer zero e em locais diferentes.
    max_buffer = db.query(func.max(Workplace.buffer_time)).filter(Workplace.user_id == user_id).scalar() or 0
    margin = timedelta(minutes=max(0, max_buffer, workplace.buffer_time or 0))
    query = db.query(Appointment).populate_existing().options(joinedload(Appointment.workplace)).filter(
        Appointment.user_id == user_id, ~Appointment.status.in_(INACTIVE_STATUSES),
        Appointment.date >= (start_dt - margin).date(),
        Appointment.date <= (end_dt + margin).date(),
    )
    if exclude_id:
        query = query.filter(Appointment.id != exclude_id)
    for other in query.all():
        buffer = timedelta(minutes=max(workplace.buffer_time or 0, other.workplace.buffer_time or 0))
        other_start = datetime.combine(other.date, other.start_time)
        other_end = datetime.combine(other.date, other.end_time)
        if start_dt < other_end + buffer and end_dt + buffer > other_start:
            raise HTTPException(status_code=409, detail="Conflito de horário na agenda (inclui o intervalo entre atendimentos e locais)")


class AppointmentCreationResult(list):
    """Mantém compatibilidade com consumidores da lista e expõe recusas da recorrência."""
    def __init__(self, appointments=(), skipped=()):
        super().__init__(appointments)
        self.skipped = list(skipped)


def _auto_mark_pending(db: Session, user_id: int) -> None:
    """Marca automaticamente como 'pending' agendamentos scheduled/confirmed cuja data já passou.
    Usa bulk UPDATE para evitar carregar todos os objetos em memória."""
    today = date.today()
    updated = db.query(Appointment).filter(
        Appointment.user_id == user_id,
        Appointment.date < today,
        Appointment.status.in_(["scheduled", "confirmed"]),
    ).update({Appointment.status: "pending"}, synchronize_session=False)
    
    if updated:
        db.commit()


def list_appointments(
    db: Session,
    user_id: int,
    workplace_id: Optional[int] = None,
    client_id: Optional[int] = None,
    appointment_date: Optional[date] = None,
    appointment_status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[Appointment]:
    """Lista agendamentos do usuário com filtros opcionais.
    Quando nenhum filtro de data é fornecido, retorna apenas agendamentos
    dos últimos 3 meses até os próximos 3 meses."""
    # Auto-marcar expirados como pendentes antes de listar
    _auto_mark_pending(db, user_id)
    
    query = (
        db.query(Appointment)
        .options(joinedload(Appointment.client), joinedload(Appointment.workplace))
        .filter(Appointment.user_id == user_id)
    )
    if workplace_id:
        query = query.filter(Appointment.workplace_id == workplace_id)
    if client_id:
        query = query.filter(Appointment.client_id == client_id)
    if appointment_date:
        query = query.filter(Appointment.date == appointment_date)
    else:
        # Filtro de intervalo de datas (ou janela padrão de 6 meses)
        if date_from:
            query = query.filter(Appointment.date >= date_from)
        elif not appointment_status:
            # Padrão: últimos 3 meses
            default_from = date.today() - timedelta(days=90)
            query = query.filter(Appointment.date >= default_from)
        if date_to:
            query = query.filter(Appointment.date <= date_to)
        elif not appointment_status:
            # Padrão: próximos 3 meses
            default_to = date.today() + timedelta(days=90)
            query = query.filter(Appointment.date <= default_to)
    if appointment_status:
        query = query.filter(Appointment.status == appointment_status)
    return query.order_by(Appointment.date, Appointment.start_time).all()


def count_pending(db: Session, user_id: int) -> int:
    """Retorna apenas a contagem de agendamentos pendentes — sem JOINs."""
    _auto_mark_pending(db, user_id)
    return db.query(Appointment).filter(
        Appointment.user_id == user_id,
        Appointment.status == "pending",
    ).count()


def get_appointment(db: Session, appointment_id: int, user_id: int) -> Appointment:
    """Busca um agendamento pelo ID."""
    appointment = db.query(Appointment).populate_existing().filter(
        Appointment.id == appointment_id,
        Appointment.user_id == user_id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    return appointment


def generate_recurrence_dates(start_date: date, limit_days: int, r_type: str, r_value: int) -> List[date]:
    if r_type not in ("weekly", "biweekly", "triweekly", "monthly"):
        raise HTTPException(status_code=400, detail="Frequência de recorrência inválida")
    if not (1 <= r_value <= 31 if r_type == "monthly" else 0 <= r_value <= 7):
        raise HTTPException(status_code=400, detail="Dia de recorrência inválido")
    dates = []
    current = start_date
    end_date = start_date + timedelta(days=limit_days)
    
    if r_type in ['weekly', 'biweekly', 'triweekly']:
        step = {'weekly': 7, 'biweekly': 14, 'triweekly': 21}[r_type]
        target_weekday = r_value or 7
        while current.isoweekday() != target_weekday:
            current += timedelta(days=1)
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=step)
            
    elif r_type == 'monthly':
        target_day = r_value
        while current <= end_date:
            _, last_day = calendar.monthrange(current.year, current.month)
            day_to_use = min(target_day, last_day)
            candidate = date(current.year, current.month, day_to_use)
            if candidate >= start_date and candidate <= end_date:
                if candidate not in dates:
                    dates.append(candidate)
            new_month = current.month + 1 if current.month < 12 else 1
            new_year = current.year + 1 if current.month == 12 else current.year
            current = date(new_year, new_month, 1)
            
    return dates

def _format_price(price) -> str:
    """Formata preço para exibição no email (ex: R$ 150,00)."""
    if price is None:
        return None
    return f"R$ {float(price):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def create_appointment(db: Session, user_id: int, data: AppointmentCreate, background_tasks: Optional[BackgroundTasks] = None) -> List[Appointment]:
    """Cria um novo agendamento (ou múltiplos se recorrente)."""
    
    _lock_schedule(db, user_id)
    _validate_resources(db, user_id, data.model_dump())
    if not getattr(data, "is_recurring", False):
        _validate_appointment(db, user_id, data.model_dump())
        appointment = Appointment(user_id=user_id, **data.model_dump(exclude={"is_recurring", "recurrence_type", "recurrence_value"}))
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        if background_tasks and appointment.client.email:
            tv = appointment.confirmation_token_version
            token_confirm = create_appointment_token(appointment.id, "confirm", token_version=tv)
            token_cancel = create_appointment_token(appointment.id, "cancel", token_version=tv)
            confirm_url = f"{settings.FRONTEND_URL}/confirmacao?token={token_confirm}"
            cancel_url = f"{settings.FRONTEND_URL}/cancelamento?token={token_cancel}"
            
            html_body = appointment_confirmation_request_html(
                client_name=appointment.client.name,
                professional_name=appointment.user.name,
                time=appointment.start_time.strftime("%H:%M"),
                date=appointment.date.strftime("%d/%m/%Y"),
                workplace_name=appointment.workplace.name,
                confirm_url=confirm_url,
                cancel_url=cancel_url,
                price=_format_price(appointment.price),
            )
            background_tasks.add_task(send_email, appointment.client.email, "Confirmação de Agendamento", html_body)

        return AppointmentCreationResult([appointment])
        
    # Lógica para recorrência
    dates_to_create = generate_recurrence_dates(
        data.date, 60, data.recurrence_type, int(data.recurrence_value)
    )
    
    if not dates_to_create:
        raise HTTPException(status_code=400, detail="Nenhuma data válida encontrada para esta regra de recorrência.")
        
    created_appointments = []
    skipped = []
    rec_id = str(uuid.uuid4())
    
    for dt in dates_to_create:
        appt_data = data.model_dump(exclude={"is_recurring", "recurrence_type", "recurrence_value"})
        appt_data["date"] = dt
        try:
            _validate_appointment(db, user_id, appt_data)
            appt = Appointment(user_id=user_id, recurrence_id=rec_id, **appt_data)
            db.add(appt)
            db.flush()
            created_appointments.append(appt)
        except HTTPException as exc:
            if exc.status_code not in (400, 409):
                raise
            skipped.append({"date": dt, "reason": exc.detail})
            
    db.commit()
    for appt in created_appointments:
        db.refresh(appt)
        
    if background_tasks and created_appointments and created_appointments[0].client.email:
        first_appt = created_appointments[0]
        html_body = appointment_package_html(
            client_name=first_appt.client.name,
            professional_name=first_appt.user.name,
            count=len(created_appointments),
            start_date=first_appt.date.strftime("%d/%m/%Y"),
            end_date=created_appointments[-1].date.strftime("%d/%m/%Y"),
            workplace_name=first_appt.workplace.name,
        )
        background_tasks.add_task(send_email, first_appt.client.email, "Seu Pacote de Agendamentos", html_body)
        
    return AppointmentCreationResult(created_appointments, skipped)


def update_appointment(
    db: Session, appointment_id: int, user_id: int, data: AppointmentUpdate, background_tasks: Optional[BackgroundTasks] = None
) -> Appointment:
    """Atualiza um agendamento existente."""
    _lock_schedule(db, user_id)
    appointment = get_appointment(db, appointment_id, user_id)
    if appointment.status in INACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail="Este agendamento já foi finalizado.")
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("status") not in (None, appointment.status, "scheduled", "confirmed"):
        raise HTTPException(status_code=400, detail="Use a operação de conclusão, resolução ou cancelamento para finalizar o atendimento")

    # Bloquear alteração de preço após confirmação do cliente
    if "price" in update_data and appointment.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar o preço após a confirmação do cliente.",
        )

    old_date = appointment.date
    old_time = appointment.start_time
    old_price = float(appointment.price) if appointment.price is not None else None

    # Mescla dados existentes com atualizações para validação completa
    validation_data = {
        "client_id": update_data.get("client_id", appointment.client_id),
        "workplace_id": update_data.get("workplace_id", appointment.workplace_id),
        "date": update_data.get("date", appointment.date),
        "start_time": update_data.get("start_time", appointment.start_time),
        "end_time": update_data.get("end_time", appointment.end_time),
    }
    _validate_appointment(db, user_id, validation_data, exclude_id=appointment_id)

    # Detectar mudanças de data/hora → setar flag rescheduled
    is_rescheduled = any(key in update_data and update_data[key] != getattr(appointment, key)
                         for key in ("date", "start_time", "end_time", "workplace_id", "client_id"))
    if is_rescheduled:
        update_data["rescheduled"] = True

    # Detectar mudança de preço
    new_price = update_data.get("price")
    price_changed = False
    if "price" in update_data:
        if old_price != new_price:
            price_changed = True

    # Links anteriores não podem confirmar dados que o cliente ainda não viu.
    if price_changed or is_rescheduled:
        _invalidate_links(appointment)

    for key, value in update_data.items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    
    if background_tasks and appointment.client.email:
        tv = appointment.confirmation_token_version

        if is_rescheduled:
            # Reagendamento: enviar email de reagendamento com preço
            token_confirm = create_appointment_token(appointment.id, "confirm", token_version=tv)
            token_cancel = create_appointment_token(appointment.id, "cancel", token_version=tv)
            confirm_url = f"{settings.FRONTEND_URL}/confirmacao?token={token_confirm}"
            cancel_url = f"{settings.FRONTEND_URL}/cancelamento?token={token_cancel}"
            
            html_body = appointment_rescheduled_request_html(
                client_name=appointment.client.name,
                professional_name=appointment.user.name,
                old_time=old_time.strftime("%H:%M"),
                old_date=old_date.strftime("%d/%m/%Y"),
                new_time=appointment.start_time.strftime("%H:%M"),
                new_date=appointment.date.strftime("%d/%m/%Y"),
                workplace_name=appointment.workplace.name,
                confirm_url=confirm_url,
                cancel_url=cancel_url,
                price=_format_price(appointment.price),
            )
            background_tasks.add_task(send_email, appointment.client.email, "Agendamento Remarcado - Confirmação", html_body)

        elif price_changed:
            # Apenas preço mudou: enviar email específico de alteração de preço
            token_confirm = create_appointment_token(appointment.id, "confirm", token_version=tv)
            token_cancel = create_appointment_token(appointment.id, "cancel", token_version=tv)
            confirm_url = f"{settings.FRONTEND_URL}/confirmacao?token={token_confirm}"
            cancel_url = f"{settings.FRONTEND_URL}/cancelamento?token={token_cancel}"

            html_body = appointment_price_changed_html(
                client_name=appointment.client.name,
                professional_name=appointment.user.name,
                time=appointment.start_time.strftime("%H:%M"),
                date=appointment.date.strftime("%d/%m/%Y"),
                workplace_name=appointment.workplace.name,
                old_price=_format_price(old_price),
                new_price=_format_price(appointment.price),
                confirm_url=confirm_url,
                cancel_url=cancel_url,
            )
            background_tasks.add_task(send_email, appointment.client.email, "Atualização de Valor - Agendamento", html_body)

    return appointment


def cancel_appointment(db: Session, appointment_id: int, user_id: int, cancel_all_future: bool = False) -> Appointment:
    """Cancela um agendamento (pelo painel do usuário) e opcionalmente seus futuros recorrentes."""
    _lock_schedule(db, user_id)
    appointment = get_appointment(db, appointment_id, user_id)
    if appointment.status in INACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail="Este agendamento já foi finalizado.")
    _invalidate_links(appointment)
    appointment.status = "canceled_user"
    
    if cancel_all_future and appointment.recurrence_id:
        future_appointments = db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.recurrence_id == appointment.recurrence_id,
            Appointment.date >= appointment.date,
            ~Appointment.status.in_(INACTIVE_STATUSES)
        ).all()
        for f_o in future_appointments:
            _invalidate_links(f_o)
            f_o.status = "canceled_user"
            
    db.commit()
    db.refresh(appointment)
    return appointment


VALID_RESOLVE_STATUSES = ["completed", "no_show", "canceled_user"]

def resolve_appointment(
    db: Session, appointment_id: int, user_id: int, new_status: str,
    paid_value: Optional[float] = None, payment_method: Optional[str] = None,
    installments: Optional[int] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Appointment:
    """Resolve um agendamento pendente definindo seu status final."""
    if new_status not in VALID_RESOLVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status inválido. Valores permitidos: {', '.join(VALID_RESOLVE_STATUSES)}"
        )
    
    _lock_schedule(db, user_id)
    appointment = get_appointment(db, appointment_id, user_id)
    
    if appointment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas agendamentos pendentes podem ser resolvidos."
        )
    
    _invalidate_links(appointment)
    appointment.status = new_status
    
    # Salvar dados de pagamento quando concluído
    if new_status == "completed" and payment_method:
        if payment_method not in VALID_PAYMENT_METHODS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Método de pagamento inválido. Valores: {', '.join(VALID_PAYMENT_METHODS)}"
            )
        appointment.payment_method = payment_method
        appointment.paid_value = None if payment_method == "free" else paid_value
        if payment_method == "credit":
            appointment.installments = installments
        else:
            appointment.installments = None
    
    db.commit()
    db.refresh(appointment)
    
    if new_status == "completed" and background_tasks and appointment.client.email:
        _send_completion_email(appointment, background_tasks)
        
    return appointment


def _send_completion_email(appointment: Appointment, background_tasks: BackgroundTasks):
    """Auxiliar para enviar e-mail de conclusão e pedido de avaliação."""
    tv = appointment.confirmation_token_version
    # We create a token specifically for the review page, maybe action="review"
    token_review = create_appointment_token(appointment.id, "review", token_version=tv)
    review_url = f"{settings.FRONTEND_URL}/avaliar?token={token_review}"
    
    paid_value_display = None
    if appointment.paid_value is not None:
        paid_value_display = f"R$ {float(appointment.paid_value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    
    html_body = appointment_completed_html(
        client_name=appointment.client.name,
        professional_name=appointment.user.name,
        time=appointment.start_time.strftime("%H:%M"),
        date=appointment.date.strftime("%d/%m/%Y"),
        workplace_name=appointment.workplace.name,
        paid_value=paid_value_display,
        payment_method=appointment.payment_method or "free",
        review_url=review_url,
    )
    background_tasks.add_task(send_email, appointment.client.email, "Atendimento Concluído - Seu Recibo e Avaliação", html_body)


def complete_appointment(
    db: Session, appointment_id: int, user_id: int,
    paid_value: Optional[float] = None, payment_method: Optional[str] = None,
    installments: Optional[int] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> Appointment:
    """Conclui um agendamento ativo (scheduled/confirmed) diretamente da agenda."""
    _lock_schedule(db, user_id)
    appointment = get_appointment(db, appointment_id, user_id)
    
    if appointment.status in ["completed", "canceled_client", "canceled_user", "no_show"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este agendamento já foi finalizado."
        )
    
    _invalidate_links(appointment)
    appointment.status = "completed"
    
    if payment_method:
        if payment_method not in VALID_PAYMENT_METHODS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Método de pagamento inválido. Valores: {', '.join(VALID_PAYMENT_METHODS)}"
            )
        appointment.payment_method = payment_method
        appointment.paid_value = None if payment_method == "free" else paid_value
        if payment_method == "credit":
            appointment.installments = installments
        else:
            appointment.installments = None
    
    db.commit()
    db.refresh(appointment)
    
    if background_tasks and appointment.client.email:
        _send_completion_email(appointment, background_tasks)
        
    return appointment
