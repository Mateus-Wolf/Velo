from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_account, CurrentAccount
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    AppointmentCreationResponse,
    ResolveAppointmentRequest,
    CompleteAppointmentRequest,
)
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Agendamentos"])


def _notify_admin_appointment(account: CurrentAccount, action: str, details: str):
    """Envia email ao admin quando staff faz ação em agendamento."""
    if account.role != "staff":
        return
    try:
        from app.services.email_service import send_email
        from app.services.email_templates import staff_action_notification_html
        html = staff_action_notification_html(
            admin_name=account.user.name,
            staff_name=account.staff.name,
            action=details,
        )
        send_email(
            to=account.user.email,
            subject=f"📋 Velo — {account.staff.name} {action}",
            html_body=html,
        )
    except Exception:
        import logging
        logging.getLogger("velo.rbac").error("Falha ao notificar admin sobre ação de staff", exc_info=True)


@router.get("/", response_model=list[AppointmentResponse])
def list_appointments(
    workplace_id: Optional[int] = None,
    client_id: Optional[int] = None,
    appointment_date: Optional[date] = None,
    appointment_status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Lista agendamentos com filtros opcionais.
    Staff só vê agendamentos dos workplaces que tem acesso."""
    appointments = appointment_service.list_appointments(
        db, account.user.id,
        workplace_id=workplace_id,
        client_id=client_id,
        appointment_date=appointment_date,
        appointment_status=appointment_status,
        date_from=date_from,
        date_to=date_to,
    )
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        appointments = [a for a in appointments if a.workplace_id in allowed_ids]
    return appointments


@router.get("/pending-count")
def get_pending_count(
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Retorna apenas a contagem de agendamentos pendentes (endpoint leve)."""
    appointment_service._auto_mark_pending(db, account.user.id)
    from app.models.appointment import Appointment
    query = db.query(Appointment).filter(
        Appointment.user_id == account.user.id, Appointment.status == "pending",
    )
    if account.role == "staff":
        query = query.filter(Appointment.workplace_id.in_(account.permissions.get("allowed_workplace_ids", [])))
    return {"count": query.count()}



@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Busca um agendamento pelo ID."""
    appt = appointment_service.get_appointment(db, appointment_id, account.user.id)
    
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        if appt.workplace_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este agendamento (local não permitido)",
            )
            
    return appt


@router.post("/", response_model=list[AppointmentResponse] | AppointmentCreationResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    include_summary: bool = False,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Cria novos agendamentos (suporta vários via recorrência)."""
    # Staff: verificar acesso ao workplace
    if account.role == "staff":
        allowed_ids = set(account.permissions.get("allowed_workplace_ids", []))
        if data.workplace_id not in allowed_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a este local de trabalho",
            )

    result = appointment_service.create_appointment(db, account.user.id, data, background_tasks)

    # Notificar admin
    if account.role == "staff" and result:
        appt = result[0]
        client_name = appt.client.name if appt.client else "cliente"
        appt_date = appt.date.strftime("%d/%m/%Y")
        appt_time = appt.start_time.strftime("%H:%M")
        _notify_admin_appointment(
            account,
            f"criou um agendamento",
            f"agendou <strong>{client_name}</strong> para {appt_date} às {appt_time}",
        )

    if include_summary:
        return {"appointments": list(result), "skipped": result.skipped}
    return result


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Atualiza um agendamento existente."""
    # Staff: verificar se pode alterar status
    if account.role == "staff" and data.status is not None:
        if not account.permissions.get("can_change_status", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para alterar o status de agendamentos",
            )

    appointment_service._lock_schedule(db, account.user.id)
    get_appointment(appointment_id, db, account)
    if account.role == "staff" and data.workplace_id is not None:
        if data.workplace_id not in account.permissions.get("allowed_workplace_ids", []):
            raise HTTPException(status_code=403, detail="Acesso negado ao local de destino")

    result = appointment_service.update_appointment(db, appointment_id, account.user.id, data, background_tasks)

    # Notificar admin sobre alterações
    if account.role == "staff":
        changes = []
        if data.date is not None:
            changes.append(f"data para {data.date.strftime('%d/%m/%Y')}")
        if data.price is not None:
            changes.append(f"valor para R$ {data.price:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
        if data.status is not None:
            changes.append(f"status para {data.status}")
        if changes:
            client_name = result.client.name if result.client else "cliente"
            _notify_admin_appointment(
                account,
                f"alterou um agendamento",
                f"alterou o agendamento de <strong>{client_name}</strong>: {', '.join(changes)}",
            )

    return result


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    cancel_all_future: bool = False,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Cancela um agendamento (opcionalmente cancelando os futuros da recorrência)."""
    # Staff precisa de permissão para alterar status
    if account.role == "staff":
        if not account.permissions.get("can_change_status", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para cancelar agendamentos",
            )

    appointment_service._lock_schedule(db, account.user.id)
    get_appointment(appointment_id, db, account)
    if cancel_all_future and account.role == "staff":
        from app.models.appointment import Appointment
        current = appointment_service.get_appointment(db, appointment_id, account.user.id)
        if current.recurrence_id:
            forbidden = db.query(Appointment).filter(
                Appointment.user_id == account.user.id,
                Appointment.recurrence_id == current.recurrence_id,
                Appointment.date >= current.date,
                ~Appointment.status.in_(appointment_service.INACTIVE_STATUSES),
                ~Appointment.workplace_id.in_(account.permissions.get("allowed_workplace_ids", [])),
            ).first()
            if forbidden:
                raise HTTPException(status_code=403, detail="A recorrência inclui locais não permitidos")

    result = appointment_service.cancel_appointment(db, appointment_id, account.user.id, cancel_all_future)

    if account.role == "staff":
        client_name = result.client.name if result.client else "cliente"
        _notify_admin_appointment(
            account,
            f"cancelou um agendamento",
            f"cancelou o agendamento de <strong>{client_name}</strong> em {result.date.strftime('%d/%m/%Y')}",
        )

    return result


@router.patch("/{appointment_id}/resolve", response_model=AppointmentResponse)
def resolve_appointment(
    appointment_id: int,
    body: ResolveAppointmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Resolve um agendamento pendente (completed, no_show, canceled_user) com dados de pagamento."""
    # Staff precisa de permissão para alterar status
    if account.role == "staff":
        if not account.permissions.get("can_change_status", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para resolver agendamentos",
            )

    appointment_service._lock_schedule(db, account.user.id)
    get_appointment(appointment_id, db, account)

    result = appointment_service.resolve_appointment(
        db, appointment_id, account.user.id,
        new_status=body.new_status,
        paid_value=body.paid_value,
        payment_method=body.payment_method,
        installments=body.installments,
        background_tasks=background_tasks,
    )

    if account.role == "staff":
        client_name = result.client.name if result.client else "cliente"
        _notify_admin_appointment(
            account,
            f"resolveu um agendamento",
            f"alterou o status do agendamento de <strong>{client_name}</strong> para <strong>{body.new_status}</strong>",
        )

    return result


@router.patch("/{appointment_id}/complete", response_model=AppointmentResponse)
def complete_appointment(
    appointment_id: int,
    body: CompleteAppointmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    account: CurrentAccount = Depends(get_current_account),
):
    """Conclui um agendamento ativo diretamente da agenda com dados de pagamento."""
    # Staff precisa de permissão para alterar status
    if account.role == "staff":
        if not account.permissions.get("can_change_status", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para concluir agendamentos",
            )

    appointment_service._lock_schedule(db, account.user.id)
    get_appointment(appointment_id, db, account)

    result = appointment_service.complete_appointment(
        db, appointment_id, account.user.id,
        paid_value=body.paid_value,
        payment_method=body.payment_method,
        installments=body.installments,
        background_tasks=background_tasks,
    )

    if account.role == "staff":
        client_name = result.client.name if result.client else "cliente"
        _notify_admin_appointment(
            account,
            f"concluiu um agendamento",
            f"concluiu o agendamento de <strong>{client_name}</strong> em {result.date.strftime('%d/%m/%Y')}",
        )

    return result
