from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---------- Entrada ----------

class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    contact: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    contact: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


# ---------- Saída ----------

class ClientResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: Optional[EmailStr] = None
    contact: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
