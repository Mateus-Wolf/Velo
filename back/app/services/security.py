import os
from cryptography.fernet import Fernet
from typing import Union

# A chave deve ser carregada de uma variável de ambiente em produção.
# Se não existir, geramos uma estável para desenvolvimento (baseada no SECRET_KEY ou fixa).
ENCRYPTION_KEY = os.getenv("MEDICAL_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Apenas para desenvolvimento. Em produção, DEVE ser definida.
    ENCRYPTION_KEY = b'v-9R_O7tFhJqU5-kXR6-Kz_Z1_y3z5E_N-6XhY7w8A4=' # Chave base64 válida

cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_data(data: Union[str, bytes]) -> bytes:
    """Criptografa texto ou bytes."""
    if isinstance(data, str):
        data = data.encode()
    return cipher_suite.encrypt(data)

def decrypt_data(encrypted_data: bytes) -> str:
    """Descriptografa para string."""
    return cipher_suite.decrypt(encrypted_data).decode()

def decrypt_bytes(encrypted_data: bytes) -> bytes:
    """Descriptografa para bytes brutos."""
    return cipher_suite.decrypt(encrypted_data)
