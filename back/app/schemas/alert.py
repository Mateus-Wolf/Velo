from datetime import datetime
from pydantic import BaseModel


# ---------- Entrada ----------

class AlertCreate(BaseModel):
    appointment_id: int
    alert_datetime: datetime


# ---------- Saída ----------

class AlertResponse(BaseModel):
    id: int
    appointment_id: int
    alert_datetime: datetime
    is_triggered: bool

    model_config = {"from_attributes": True}
