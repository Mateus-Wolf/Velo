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


class AppointmentUpdate(BaseModel):
    workplace_id: Optional[int] = None
    client_id: Optional[int] = None
    date: Optional[_dt.date] = None
    start_time: Optional[_dt.time] = None
    end_time: Optional[_dt.time] = None
    status: Optional[str] = None  # scheduled | confirmed | completed | pending | canceled_client | canceled_user | no_show
    price: Optional[float] = None


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
    recurrence_id: Optional[str] = None
    created_at: _dt.datetime
    client_name: Optional[str] = None
    workplace_name: Optional[str] = None

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
