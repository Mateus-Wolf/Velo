from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

# ---------- Attachment ----------
class AttachmentBase(BaseModel):
    file_path: str
    file_type: Optional[str] = None
    label: Optional[str] = None

class AttachmentResponse(AttachmentBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}

class AttachmentUpdate(BaseModel):
    label: Optional[str] = None

# ---------- Medical Record ----------
class MedicalRecordCreate(BaseModel):
    client_id: int
    appointment_id: Optional[int] = None
    type: str  # anamnesis ou evolution
    content: str

class MedicalRecordUpdate(BaseModel):
    content: Optional[str] = None

class MedicalRecordResponse(BaseModel):
    id: int
    client_id: int
    appointment_id: Optional[int] = None
    type: str
    content: str
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentResponse] = []

    model_config = {"from_attributes": True}

# ---------- Consent Form ----------
class ConsentFormCreate(BaseModel):
    client_id: int
    appointment_id: Optional[int] = None
    title: str
    content: str

class ConsentFormUpdate(BaseModel):
    signature_data: str
    signed_at: datetime

class ConsentFormResponse(BaseModel):
    id: int
    client_id: int
    appointment_id: Optional[int] = None
    title: str
    content: str
    signature_data: Optional[str] = None
    signed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
