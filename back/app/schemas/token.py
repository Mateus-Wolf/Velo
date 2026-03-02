from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TwoFactorVerifyRequest(BaseModel):
    temp_token: str
    code: str
    device_id: str


class TwoFactorActivationVerifyRequest(BaseModel):
    code: str
