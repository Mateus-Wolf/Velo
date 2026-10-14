from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# O banco é remoto (Supabase): cada round-trip custa ~150ms. Por isso:
#  - pool maior e reciclado antes do servidor derrubar conexões ociosas
#    (sem pool_pre_ping, que adicionaria 1 round-trip a cada checkout);
#  - requisições de LEITURA usam um engine em AUTOCOMMIT, eliminando os round-trips
#    de BEGIN e ROLLBACK que o psycopg2 faria em toda sessão transacional
#    (uma requisição com 2 queries caía de ~590ms para ~310ms).
_engine_kwargs = {} if _is_sqlite else dict(pool_size=10, max_overflow=10, pool_recycle=240)

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

if _is_sqlite:
    read_engine = engine
else:
    read_engine = create_engine(
        settings.DATABASE_URL, isolation_level="AUTOCOMMIT", **_engine_kwargs,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
ReadSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=read_engine)

_READ_METHODS = {"GET", "HEAD", "OPTIONS"}


class Base(DeclarativeBase):
    """Classe base para todos os models SQLAlchemy."""
    pass


def get_db(request: Request):
    """Dependency do FastAPI para injeção de sessão do banco.

    GET/HEAD/OPTIONS recebem uma sessão em AUTOCOMMIT (somente leitura na prática);
    demais métodos recebem a sessão transacional normal.
    """
    factory = ReadSessionLocal if request.method in _READ_METHODS else SessionLocal
    db = factory()
    try:
        yield db
    finally:
        db.close()
