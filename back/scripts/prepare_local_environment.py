"""Prepara a configuração local sem substituir chaves existentes."""
import os
import secrets
from pathlib import Path

from cryptography.fernet import Fernet
from dotenv import dotenv_values, set_key
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url

BACK = Path(__file__).resolve().parents[1]


def prepare(back: Path = BACK) -> int:
    env = back / ".env"
    if not env.exists():
        template = (back / ".env.example").read_text(encoding="utf-8")
        # Exclusive creation prevents overwriting a configuration supplied concurrently.
        with env.open("x", encoding="utf-8") as handle:
            handle.write(template)
        set_key(str(env), "SECRET_KEY", secrets.token_urlsafe(48))
        for field in ("MAIL_PASSWORD", "GEMINI_API_KEY", "FIREBASE_CREDENTIALS_JSON"):
            set_key(str(env), field, "")
        print("Criado back/.env. Configure a conexao PostgreSQL antes de continuar.")
        return 2

    config = {**dotenv_values(env), **os.environ}
    database_url = config.get("DATABASE_URL", "")
    if not database_url or "usuario:senha@" in database_url:
        print("Configure DATABASE_URL em back/.env com usuario, senha, servidor e banco.")
        return 2

    try:
        if make_url(database_url).get_backend_name() != "postgresql":
            print("Este inicializador requer um banco PostgreSQL.")
            return 2
        engine = create_engine(database_url, connect_args={"connect_timeout": 5})
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                clinical_data = False
                schema = inspect(connection)
                for table in ("medical_records", "consent_forms", "attachments"):
                    if schema.has_table(table):
                        clinical_data |= connection.execute(text(f"SELECT 1 FROM {table} LIMIT 1")).first() is not None
        finally:
            engine.dispose()
    except Exception:
        # Driver errors can include credentials; do not print their raw messages.
        print("Nao foi possivel acessar o PostgreSQL. Confira DATABASE_URL, o servico e a existencia do banco.")
        return 2

    key = config.get("MEDICAL_ENCRYPTION_KEY", "").strip()
    if not key:
        if clinical_data:
            print("O banco ja possui dados clinicos. Configure a MEDICAL_ENCRYPTION_KEY original.")
            print("Para trocar a chave, siga docs/security-upgrade.md. Nenhuma chave foi substituida.")
            return 2
        if "MEDICAL_ENCRYPTION_KEY" in os.environ:
            print("Remova a variavel MEDICAL_ENCRYPTION_KEY vazia do ambiente e execute novamente.")
            return 1
        key = Fernet.generate_key().decode()
        set_key(str(env), "MEDICAL_ENCRYPTION_KEY", key)
        print("Chave clinica criada para o banco sem dados clinicos. Guarde back/.env com seguranca.")
    try:
        Fernet(key.encode())
    except (ValueError, TypeError):
        print("MEDICAL_ENCRYPTION_KEY invalida. Corrija back/.env usando a chave correta.")
        return 2
    print("Configuracao e conexao com PostgreSQL verificadas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(prepare())
