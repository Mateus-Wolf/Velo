import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import engine, Base
from app.models import *  # noqa: F401,F403 — registra todos os models na Base

from app.routers import auth, workplaces, clients, appointments, alerts, notifications, profile, public_appointments, dashboard, gemini
from app.services.notification_scheduler import check_and_send_notifications

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mindflow")

from app.services.holiday_service import prefetch_current_year_holidays

# Cria as tabelas no banco (somente se não existirem)
Base.metadata.create_all(bind=engine)

# Scheduler de notificações e tarefas periódicas
scheduler = BackgroundScheduler()
scheduler.add_job(
    check_and_send_notifications,
    "interval",
    minutes=5,
    id="notification_check",
    replace_existing=True,
)
scheduler.add_job(
    prefetch_current_year_holidays,
    trigger="cron",
    month=1,
    day=1,
    hour=0,
    minute=1,
    id="holiday_prefetch",
    replace_existing=True,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação (startup/shutdown)."""
    # Startup
    scheduler.start()
    logger.info("⏰ Schedulers iniciados")
    
    # Pré-busca os feriados ao iniciar a aplicação
    prefetch_current_year_holidays()
    
    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("⏰ Schedulers parados")


app = FastAPI(
    title="MindFlow Agenda API",
    description="API REST para sistema de agenda profissional",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — permite requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra routers com prefixo versionado
API_V1 = "/api/v1"

app.include_router(auth.router, prefix=API_V1)
app.include_router(workplaces.router, prefix=API_V1)
app.include_router(clients.router, prefix=API_V1)
app.include_router(appointments.router, prefix=API_V1)
app.include_router(public_appointments.router, prefix=API_V1)
app.include_router(alerts.router, prefix=API_V1)
app.include_router(notifications.router, prefix=API_V1)
app.include_router(profile.router, prefix=API_V1)
app.include_router(dashboard.router, prefix=API_V1)
app.include_router(gemini.router, prefix=API_V1)

# Servir arquivos estáticos (avatares)
import os
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "avatars"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
def root():
    return {"message": "MindFlow Agenda API v1.0.0", "docs": "/docs"}
