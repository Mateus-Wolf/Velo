from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# ---------- Entrada ----------

class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    workplace_ids: List[int] = []
    can_change_status: bool = False
    avatar_url: Optional[str] = None


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    can_change_status: Optional[bool] = None
    is_active: Optional[bool] = None
    workplace_ids: Optional[List[int]] = None
    avatar_url: Optional[str] = None


# ---------- Saída ----------

class StaffResponse(BaseModel):
    id: int
    admin_user_id: int
    name: str
    email: str
    can_change_status: bool = False
    is_active: bool = True
    workplace_ids: List[int] = []
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
