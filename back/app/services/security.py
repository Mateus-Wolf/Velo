from cryptography.fernet import Fernet, MultiFernet
from typing import Union

from app.config import settings


def get_cipher() -> MultiFernet:
    """Grava com a chave atual e lê chaves anteriores explicitamente configuradas."""
    if not settings.MEDICAL_ENCRYPTION_KEY.strip():
        raise RuntimeError("Configure MEDICAL_ENCRYPTION_KEY. Consulte docs/security-upgrade.md.")
    keys = [settings.MEDICAL_ENCRYPTION_KEY.strip()]
    keys.extend(key.strip() for key in settings.MEDICAL_PREVIOUS_ENCRYPTION_KEYS.split(",") if key.strip())
    try:
        return MultiFernet([Fernet(key.encode()) for key in keys])
    except (ValueError, TypeError) as exc:
        raise RuntimeError("Chave de criptografia clínica inválida.") from exc

def encrypt_data(data: Union[str, bytes]) -> bytes:
    """Criptografa texto ou bytes."""
    if isinstance(data, str):
        data = data.encode()
    return get_cipher().encrypt(data)

def decrypt_data(encrypted_data: bytes) -> str:
    """Descriptografa para string."""
    return get_cipher().decrypt(encrypted_data).decode()

def decrypt_bytes(encrypted_data: bytes) -> bytes:
    """Descriptografa para bytes brutos."""
    return get_cipher().decrypt(encrypted_data)
