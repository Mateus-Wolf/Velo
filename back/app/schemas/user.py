from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ---------- Entrada ----------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    monthly_goal: Optional[float] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ---------- Saída ----------

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    two_factor_enabled: bool = False
    monthly_goal: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
