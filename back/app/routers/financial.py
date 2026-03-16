from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import database
from app.auth.dependencies import require_admin, CurrentAccount
from app.schemas.goal_history import (
    SetGoalRequest,
    SetGoalResponse,
    GoalHistoryListResponse,
    GoalHistoryItem,
    FinancialProjectionResponse,
)
from app.services.financial_service import (
    save_goal,
    get_goal_history,
    clear_goal_history,
    generate_financial_projection,
    invalidate_projection_cache,
)

router = APIRouter(tags=["Financial"])


@router.put("/financial/goal", response_model=SetGoalResponse)
def set_financial_goal(
    body: SetGoalRequest,
    db: Session = Depends(database.get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Salva a nova meta de faturamento e registra a meta anterior no histórico."""
    try:
        new_goal = save_goal(db=db, user_id=account.user.id, new_goal=body.goal_value)
        invalidate_projection_cache(account.user.id)
        return {"monthly_goal": new_goal, "message": "Meta atualizada com sucesso!"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar meta: {str(e)}"
        )


@router.get("/financial/goal-history", response_model=GoalHistoryListResponse)
def get_financial_goal_history(
    db: Session = Depends(database.get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Lista o histórico de metas do usuário."""
    try:
        history = get_goal_history(db=db, user_id=account.user.id)
        return {"history": [GoalHistoryItem.model_validate(h) for h in history]}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar histórico: {str(e)}"
        )


@router.delete("/financial/goal-history")
def delete_financial_goal_history(
    db: Session = Depends(database.get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Limpa todo o histórico de metas do usuário."""
    try:
        count = clear_goal_history(db=db, user_id=account.user.id)
        return {"message": f"{count} registro(s) removido(s) do histórico."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao limpar histórico: {str(e)}"
        )


@router.post("/financial/projection", response_model=FinancialProjectionResponse)
def get_financial_projection(
    force_refresh: bool = False,
    db: Session = Depends(database.get_db),
    account: CurrentAccount = Depends(require_admin),
):
    """Gera projeção financeira usando Gemini baseada na meta atual."""
    try:
        user_goal = account.user.monthly_goal or 0.0
        if user_goal <= 0:
            return {"projection": "Defina uma meta acima de zero para gerar uma projeção."}

        projection = generate_financial_projection(
            db=db, user_id=account.user.id, goal=user_goal, force_refresh=force_refresh
        )
        return {"projection": projection}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao gerar projeção: {str(e)}"
        )
