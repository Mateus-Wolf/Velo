from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status, BackgroundTasks

from app.models.appointment import Appointment
from app.models.workplace import Workplace
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.config import settings
from app.services.email_service import send_email
from app.services.email_templates import appointment_confirmation_request_html, appointment_rescheduled_request_html, appointment_package_html
from app.auth.security import create_appointment_token
from app.services.holiday_service import is_holiday
import uuid
import calendar
from datetime import timedelta


def _validate_appointment(db: Session, user_id: int, data: Dict, exclude_id: Optional[int] = None) -> None:
    """Valida regras de negócio do agendamento."""
    # 1. Não permitir agendar no passado (compara em hora local)
    appt_date = data.get("date")
    appt_start = data.get("start_time")
    if appt_date and appt_start:
        appt_datetime = datetime.combine(appt_date, appt_start)
        if appt_datetime < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é permitido agendar no passado",
            )

    # 2. Verificar horário dentro do expediente do local
    workplace_id = data.get("workplace_id")
    if workplace_id:
        workplace = db.query(Workplace).filter(Workplace.id == workplace_id).first()
        if not workplace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado")

        start_time = data.get("start_time")
        end_time = data.get("end_time")
        if start_time and end_time:
            if start_time < workplace.start_time or end_time > workplace.end_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Horário fora do expediente do local",
                )
            
            if workplace.break_start_time and workplace.break_end_time:
                if max(start_time, workplace.break_start_time) < min(end_time, workplace.break_end_time):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Horário coincide com o intervalo do local",
                    )

        # 3. Verificar dia da semana
        if appt_date:
            day_of_week = appt_date.isoweekday()  # 1=seg, 7=dom
            allowed_days = [int(d.strip()) for d in workplace.work_days.split(",")]
            if day_of_week not in allowed_days:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O local não funciona neste dia da semana",
                )
                
        # 3.5. Verificar Feriados
        if appt_date:
            if not workplace.works_on_holidays and is_holiday(appt_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="O local selecionado não possui expediente em feriados.",
                )

    # 4. Verificar conflito de horário no mesmo local
    if workplace_id and appt_date and start_time and end_time:
        conflict_query = db.query(Appointment).filter(
            Appointment.workplace_id == workplace_id,
            Appointment.date == appt_date,
            Appointment.status != "canceled",
            Appointment.start_time < end_time,
            Appointment.end_time > start_time,
        )
        if exclude_id:
            conflict_query = conflict_query.filter(Appointment.id != exclude_id)

        if conflict_query.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Conflito de horário neste local",
            )


def list_appointments(
    db: Session,
    user_id: int,
    workplace_id: Optional[int] = None,
    client_id: Optional[int] = None,
    appointment_date: Optional[date] = None,
    appointment_status: Optional[str] = None,
) -> List[Appointment]:
    """Lista agendamentos do usuário com filtros opcionais."""
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
    if appointment_status:
        query = query.filter(Appointment.status == appointment_status)
    return query.order_by(Appointment.date, Appointment.start_time).all()


def get_appointment(db: Session, appointment_id: int, user_id: int) -> Appointment:
    """Busca um agendamento pelo ID."""
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.user_id == user_id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    return appointment


def generate_recurrence_dates(start_date: date, limit_days: int, r_type: str, r_value: int) -> List[date]:
    dates = []
    current = start_date
    end_date = start_date + timedelta(days=limit_days)
    
    if r_type in ['weekly', 'biweekly', 'triweekly']:
        step = {'weekly': 7, 'biweekly': 14, 'triweekly': 21}[r_type]
        target_weekday = r_value
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

def create_appointment(db: Session, user_id: int, data: AppointmentCreate, background_tasks: Optional[BackgroundTasks] = None) -> List[Appointment]:
    """Cria um novo agendamento (ou múltiplos se recorrente)."""
    
    if not getattr(data, "is_recurring", False):
        _validate_appointment(db, user_id, data.model_dump())
        appointment = Appointment(user_id=user_id, **data.model_dump(exclude={"is_recurring", "recurrence_type", "recurrence_value"}))
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        if background_tasks and appointment.client.email:
            token_confirm = create_appointment_token(appointment.id, "confirm")
            token_cancel = create_appointment_token(appointment.id, "cancel")
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
            )
            background_tasks.add_task(send_email, appointment.client.email, "Confirmação de Agendamento", html_body)

        return [appointment]
        
    # Lógica para recorrência
    dates_to_create = generate_recurrence_dates(
        data.date, 60, data.recurrence_type, int(data.recurrence_value)
    )
    
    if not dates_to_create:
        raise HTTPException(status_code=400, detail="Nenhuma data válida encontrada para esta regra de recorrência.")
        
    created_appointments = []
    rec_id = str(uuid.uuid4())
    
    for dt in dates_to_create:
        appt_data = data.model_dump(exclude={"is_recurring", "recurrence_type", "recurrence_value"})
        appt_data["date"] = dt
        try:
            _validate_appointment(db, user_id, appt_data)
            appt = Appointment(user_id=user_id, recurrence_id=rec_id, **appt_data)
            db.add(appt)
            created_appointments.append(appt)
        except HTTPException:
            # Ignora dias com conflitos ou fora de expediente
            continue
            
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
        
    return created_appointments


def update_appointment(
    db: Session, appointment_id: int, user_id: int, data: AppointmentUpdate, background_tasks: Optional[BackgroundTasks] = None
) -> Appointment:
    """Atualiza um agendamento existente."""
    appointment = get_appointment(db, appointment_id, user_id)
    update_data = data.model_dump(exclude_unset=True)

    old_date = appointment.date
    old_time = appointment.start_time

    # Mescla dados existentes com atualizações para validação completa
    validation_data = {
        "workplace_id": update_data.get("workplace_id", appointment.workplace_id),
        "date": update_data.get("date", appointment.date),
        "start_time": update_data.get("start_time", appointment.start_time),
        "end_time": update_data.get("end_time", appointment.end_time),
    }
    _validate_appointment(db, user_id, validation_data, exclude_id=appointment_id)

    # Se a data mudou, marcar como reagendado
    is_rescheduled = False
    new_date = update_data.get("date")
    new_time = update_data.get("start_time")
    if (new_date and new_date != old_date) or (new_time and new_time != old_time):
        update_data["status"] = "rescheduled"
        is_rescheduled = True

    for key, value in update_data.items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    
    if background_tasks and is_rescheduled and appointment.client.email:
        token_confirm = create_appointment_token(appointment.id, "confirm")
        token_cancel = create_appointment_token(appointment.id, "cancel")
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
        )
        background_tasks.add_task(send_email, appointment.client.email, "Agendamento Remarcado - Confirmação", html_body)

    return appointment


def cancel_appointment(db: Session, appointment_id: int, user_id: int, cancel_all_future: bool = False) -> Appointment:
    """Cancela um agendamento e opcionalmente seus futuros recorrentes."""
    appointment = get_appointment(db, appointment_id, user_id)
    appointment.status = "canceled"
    
    if cancel_all_future and appointment.recurrence_id:
        future_appointments = db.query(Appointment).filter(
            Appointment.user_id == user_id,
            Appointment.recurrence_id == appointment.recurrence_id,
            Appointment.date >= appointment.date,
            Appointment.status != "canceled"
        ).all()
        for f_o in future_appointments:
            f_o.status = "canceled"
            
    db.commit()
    db.refresh(appointment)
    return appointment
