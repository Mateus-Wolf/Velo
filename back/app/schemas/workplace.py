from __future__ import annotations

from datetime import time, datetime
from typing import Optional

from pydantic import BaseModel


# ---------- Entrada ----------

class WorkplaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    address: Optional[str] = None
    cep: Optional[str] = None
    number: Optional[str] = None
    work_days: str  # ex: "1,2,3,4,5"
    start_time: time
    end_time: time
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    works_on_holidays: bool = False


class WorkplaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    address: Optional[str] = None
    cep: Optional[str] = None
    number: Optional[str] = None
    work_days: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    works_on_holidays: Optional[bool] = None


# ---------- Saída ----------

class WorkplaceResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    address: Optional[str] = None
    cep: Optional[str] = None
    number: Optional[str] = None
    work_days: str
    start_time: time
    end_time: time
    break_start_time: Optional[time] = None
    break_end_time: Optional[time] = None
    is_active: bool
    works_on_holidays: bool
    created_at: datetime

    model_config = {"from_attributes": True}
