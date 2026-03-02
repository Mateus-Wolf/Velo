from pydantic import BaseModel, EmailStr


class ForgotPasswordRequest(BaseModel):
    """Solicita envio de código de recuperação."""
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    """Valida o código de recuperação."""
    email: EmailStr
    code: str


class ResetPasswordRequest(BaseModel):
    """Redefine a senha usando o token temporário."""
    reset_token: str
    new_password: str


class MessageResponse(BaseModel):
    """Resposta genérica com mensagem."""
    message: str
