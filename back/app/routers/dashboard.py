from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import database
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardMetricsResponse, AIInsightResponse
from app.services.dashboard_service import get_dashboard_metrics
from app.services.gemini_service import generate_dashboard_insights

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_metrics(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna métricas consolidadas do dashboard:
    - Top 3 clientes que mais vão
    - Top 3 atendimentos mais demorados
    - Top 3 locais com mais clientes
    - Gráfico agrupado de dias da semana
    - Gráfico agrupado de horários de pico
    - Quantidade de cancelados e reagendados
    """
    try:
        metrics = get_dashboard_metrics(db=db, user_id=current_user.id)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar métricas do dashboard: {str(e)}"
        )

@router.get("/dashboard/ai-insights", response_model=AIInsightResponse)
def get_ai_insights(
    db: Session = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analisa as métricas do usuário logado via Gemini e retorna um insight/dica em markdown.
    """
    try:
        insight = generate_dashboard_insights(db=db, current_user=current_user)
        return {"insight": insight}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar dicas através da IA: {str(e)}"
        )
