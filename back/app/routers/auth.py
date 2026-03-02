import random
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token, RefreshRequest, TwoFactorVerifyRequest, TwoFactorActivationVerifyRequest
from app.schemas.password_reset import (
    ForgotPasswordRequest,
    VerifyCodeRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.user_service import create_user, authenticate_user, get_user_by_email
from app.auth.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
)
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.password_reset import PasswordReset
from app.models.recognized_device import RecognizedDevice
from app.services.email_service import send_email
from app.services.email_templates import password_reset_code, two_factor_code_html

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Cadastro de novo usuário."""
    return create_user(db, user_data)


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    remember_me: bool = Form(False),
    device_id: str = Form(None)
):
    """Login — retorna access_token e refresh_token JWT. Se tiver 2FA ativo, retorna requires_2fa."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )
    
    # ---------------- 2FA Check ----------------
    if user.two_factor_enabled:
        # Verifica se o device_id é reconhecido e válido
        is_recognized = False
        if device_id:
            device = db.query(RecognizedDevice).filter(
                RecognizedDevice.user_id == user.id,
                RecognizedDevice.device_id == device_id,
                RecognizedDevice.expires_at > datetime.now()
            ).first()
            if device:
                is_recognized = True
        
        if not is_recognized:
            # Precisa do 2FA. Gera código e bloqueia o login direto.
            code = _generate_code()
            user.two_factor_code = code
            user.two_factor_expires_at = datetime.now() + timedelta(minutes=10)
            db.commit()

            # Envia email com o código
            try:
                html = two_factor_code_html(user_name=user.name, code=code, action="login")
                send_email(
                    to=user.email,
                    subject=f"🔐 Velo — Seu código de login: {code}",
                    html_body=html,
                )
            except Exception as exc:
                import logging
                logging.getLogger("mindflow.auth").error("Falha ao enviar email 2FA: %s", exc)
            
            # Gera token temporário apenas para a rota de validação do 2FA
            temp_token = create_access_token(data={"sub": str(user.id), "type": "2fa_login"}, expires_delta=timedelta(minutes=10))
            return {
                "requires_2fa": True,
                "temp_token": temp_token,
                "message": "Código de verificação enviado para o seu e-mail.",
            }
    # -------------------------------------------

    # Define expiração: 20 dias se 'remember_me' for True, caso contrário padrão (1h/7d)
    access_delta = timedelta(days=20) if remember_me else None
    refresh_delta = timedelta(days=20) if remember_me else None

    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=access_delta)
    refresh_token = create_refresh_token(data={"sub": str(user.id)}, expires_delta=refresh_delta)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Gera novos tokens a partir de um refresh_token válido."""
    payload = decode_access_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sem identificação de usuário",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )

    new_access = create_access_token(data={"sub": str(user.id)})
    new_refresh = create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Retorna dados do usuário autenticado."""
    return current_user


# ------------------------------------------------------------------ #
#  Password Recovery Flow                                              #
# ------------------------------------------------------------------ #

def _generate_code() -> str:
    """Gera código numérico de 6 dígitos."""
    return "".join(random.choices(string.digits, k=6))


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Solicitar código de recuperação de senha",
)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Envia um código de 6 dígitos para o email informado.
    Sempre retorna sucesso para não revelar se o email existe."""

    user = get_user_by_email(db, data.email)
    if not user:
        # Não revelar se o email existe — retorna sucesso silencioso
        return MessageResponse(message="Se o email estiver cadastrado, você receberá um código de verificação.")

    # Invalidar códigos anteriores ainda não usados
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used == False,  # noqa: E712
    ).update({"used": True})

    # Criar novo código
    code = _generate_code()
    reset = PasswordReset(
        user_id=user.id,
        code=code,
        expires_at=datetime.now() + timedelta(minutes=15),
    )
    db.add(reset)
    db.commit()

    # Enviar email
    try:
        html = password_reset_code(user_name=user.name, code=code)
        send_email(
            to=user.email,
            subject=f"🔑 MindFlow — Código de recuperação: {code}",
            html_body=html,
        )
    except Exception as exc:
        import logging
        logging.getLogger("mindflow.auth").error("Falha ao enviar email de recuperação: %s", exc)

    return MessageResponse(message="Se o email estiver cadastrado, você receberá um código de verificação.")


@router.post(
    "/verify-code",
    summary="Verificar código de recuperação",
)
def verify_code(data: VerifyCodeRequest, db: Session = Depends(get_db)):
    """Valida o código e retorna um token temporário para redefinir a senha."""

    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido ou expirado",
        )

    reset = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.user_id == user.id,
            PasswordReset.code == data.code,
            PasswordReset.used == False,  # noqa: E712
            PasswordReset.expires_at > datetime.now(),
        )
        .order_by(PasswordReset.created_at.desc())
        .first()
    )

    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido ou expirado",
        )

    # Marcar como usado
    reset.used = True
    db.commit()

    # Gerar token temporário (5 minutos) para a redefinição
    reset_token = create_access_token(
        data={"sub": str(user.id), "type": "reset"},
        expires_delta=timedelta(minutes=5),
    )

    return {"message": "Código verificado com sucesso!", "reset_token": reset_token}


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Redefinir senha com token",
)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Redefine a senha usando o token temporário gerado na verificação do código."""

    payload = decode_access_token(data.reset_token)
    if payload is None or payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado. Solicite um novo código.",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A senha deve ter no mínimo 6 caracteres",
        )

    user.password_hash = hash_password(data.new_password)
    db.commit()

    return MessageResponse(message="Senha redefinida com sucesso!")


# ------------------------------------------------------------------ #
#  2FA (Two-Factor Authentication) Flow                              #
# ------------------------------------------------------------------ #

@router.post("/2fa/verify-login")
def verify_login_2fa(data: TwoFactorVerifyRequest, db: Session = Depends(get_db)):
    """Valida o código de 2FA enviado no login e retorna os tokens definitivos."""
    payload = decode_access_token(data.temp_token)
    if payload is None or payload.get("type") != "2fa_login":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token temporário inválido ou expirado",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    
    if not user or not user.two_factor_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA não iniciado ou usuário não encontrado")
    
    if user.two_factor_expires_at < datetime.now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código expirado. Tente logar novamente.")
        
    if user.two_factor_code != data.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido.")
    
    # Sucesso na validação! Limpa o código e registra o dispositivo
    user.two_factor_code = None
    user.two_factor_expires_at = None
    
    if data.device_id:
        existing_device = db.query(RecognizedDevice).filter(
            RecognizedDevice.user_id == user.id,
            RecognizedDevice.device_id == data.device_id
        ).first()
        
        if existing_device:
            existing_device.expires_at = datetime.now() + timedelta(days=30)
        else:
            new_device = RecognizedDevice(
                user_id=user.id,
                device_id=data.device_id,
                expires_at=datetime.now() + timedelta(days=30)
            )
            db.add(new_device)
            
    db.commit()
    
    # Gera tokens para o login real
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=20))
    refresh_token = create_refresh_token(data={"sub": str(user.id)}, expires_delta=timedelta(days=20))
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/2fa/generate-activation", response_model=MessageResponse)
def generate_2fa_activation(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Gera um código e envia por email para confirmar a ativação/desativação do 2FA do usuário logado."""
    code = _generate_code()
    current_user.two_factor_code = code
    current_user.two_factor_expires_at = datetime.now() + timedelta(minutes=10)
    db.commit()
    
    status_msg = "desativação" if current_user.two_factor_enabled else "ativação"
    
    try:
        html = two_factor_code_html(user_name=current_user.name, code=code, action=status_msg)
        send_email(
            to=current_user.email,
            subject=f"🔐 Velo — Seu código de {status_msg} do 2FA: {code}",
            html_body=html,
        )
    except Exception as exc:
        import logging
        logging.getLogger("mindflow.auth").error("Falha ao enviar email 2FA config: %s", exc)
        
    return MessageResponse(message=f"Código de {status_msg} enviado para o seu e-mail.")


@router.post("/2fa/activate", response_model=MessageResponse)
def activate_2fa(data: TwoFactorActivationVerifyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Valida o código para ligar ou desligar definitivamente o 2FA."""
    if not current_user.two_factor_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solicitação de código 2FA não encontrada.")
        
    if current_user.two_factor_expires_at < datetime.now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código expirado.")
        
    if current_user.two_factor_code != data.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código inválido.")
        
    # Toggle (Inverte o status atual)
    current_user.two_factor_enabled = not current_user.two_factor_enabled
    current_user.two_factor_code = None
    current_user.two_factor_expires_at = None
    
    # Se desativou, podemos opcionalmente limpar todos os dispositivos reconhecidos, 
    # ou deixá-los lá para quando o usuário reativar. Vamos limpá-los por segurança.
    if not current_user.two_factor_enabled:
        db.query(RecognizedDevice).filter(RecognizedDevice.user_id == current_user.id).delete()
        
    db.commit()
    
    action = "ativada" if current_user.two_factor_enabled else "desativada"
    return MessageResponse(message=f"Verificação em duas etapas {action} com sucesso!")
