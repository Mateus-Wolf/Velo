from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Classe base para todos os models SQLAlchemy."""
    pass


def get_db():
    """Dependency do FastAPI para injeção de sessão do banco."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
