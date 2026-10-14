import datetime as _dt
from typing import Optional

from pydantic import BaseModel, model_validator


# ---------- Entrada ----------

class AppointmentCreate(BaseModel):
    workplace_id: int
    client_id: int
    date: _dt.date
    start_time: _dt.time
    end_time: _dt.time
    price: Optional[float] = None
    is_recurring: Optional[bool] = False
    recurrence_type: Optional[str] = None # 'weekly', 'biweekly', 'triweekly', 'monthly'
    recurrence_value: Optional[str] = None # Day of the week (0-6) or day of the month (1-31)

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.end_time <= self.start_time:
            raise ValueError("O horário final deve ser posterior ao inicial")
        if self.is_recurring:
            if self.recurrence_type not in ("weekly", "biweekly", "triweekly", "monthly"):
                raise ValueError("Frequência de recorrência inválida")
            try:
                day = int(self.recurrence_value)
            except (TypeError, ValueError):
                raise ValueError("Dia de recorrência inválido")
            if not (1 <= day <= 31 if self.recurrence_type == "monthly" else 0 <= day <= 7):
                raise ValueError("Dia de recorrência inválido")
        return self

class AppointmentUpdate(BaseModel):
    workplace_id: Optional[int] = None
    client_id: Optional[int] = None
    date: Optional[_dt.date] = None
    start_time: Optional[_dt.time] = None
    end_time: Optional[_dt.time] = None
    status: Optional[str] = None  # scheduled | confirmed | completed | pending | canceled_client | canceled_user | no_show
    price: Optional[float] = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for name in ("workplace_id", "client_id", "date", "start_time", "end_time", "status"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} não pode ser nulo")
        return self


VALID_PAYMENT_METHODS = ["pix", "credit", "debit", "boleto", "cash", "free"]


class ResolveAppointmentRequest(BaseModel):
    new_status: str  # completed | no_show | canceled_user
    paid_value: Optional[float] = None
    payment_method: Optional[str] = None  # pix | credit | debit | boleto | cash | free
    installments: Optional[int] = None


class CompleteAppointmentRequest(BaseModel):
    """Usado para concluir agendamentos diretamente da agenda (não-pendentes)."""
    paid_value: Optional[float] = None
    payment_method: Optional[str] = None  # pix | credit | debit | boleto | cash | free
    installments: Optional[int] = None


# ---------- Reviews ----------

class ReviewCreate(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    appointment_id: int
    rating: int
    comment: Optional[str] = None
    created_at: _dt.datetime

    model_config = {"from_attributes": True}


# ---------- Saída ----------

class AppointmentResponse(BaseModel):
    id: int
    user_id: int
    workplace_id: int
    client_id: int
    date: _dt.date
    start_time: _dt.time
    end_time: _dt.time
    status: str
    rescheduled: bool = False
    price: Optional[float] = None
    paid_value: Optional[float] = None
    payment_method: Optional[str] = None
    installments: Optional[int] = None
    recurrence_id: Optional[str] = None
    created_at: _dt.datetime
    client_name: Optional[str] = None
    workplace_name: Optional[str] = None
    review: Optional[ReviewResponse] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _load_names(cls, data):
        # Works with ORM objects that have .client and .workplace relationships
        if hasattr(data, "client") and data.client:
            data.client_name = data.client.name
        if hasattr(data, "workplace") and data.workplace:
            data.workplace_name = data.workplace.name
        return data


class SkippedAppointment(BaseModel):
    date: _dt.date
    reason: str


class AppointmentCreationResponse(BaseModel):
    appointments: list[AppointmentResponse]
    skipped: list[SkippedAppointment]
