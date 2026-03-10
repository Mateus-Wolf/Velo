from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configurações da aplicação carregadas do .env"""

    DATABASE_URL: str = "postgresql://postgres:1234@localhost:5432/Schedly"
    SECRET_KEY: str = "sua-chave-secreta-aqui-troque-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email (SMTP)
    MAIL_FROM: str = "mindflow.noreply@gmail.com"
    MAIL_PASSWORD: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    FRONTEND_URL: str = "http://localhost:5173"
    GEMINI_API_KEY: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Retorna a lista de origens permitidas baseada no FRONTEND_URL"""
        origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
        if self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
