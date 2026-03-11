from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.user import User
from app.models.goal_history import GoalHistory
from app.models.appointment import Appointment

# Cache em memória para projeções financeiras (user_id -> result)
_projection_cache: dict[int, str] = {}


def save_goal(db: Session, user_id: int, new_goal: float) -> float:
    """
    Salva a nova meta. Se já existia uma meta (> 0), fecha a anterior
    registrando no histórico antes de atualizar.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("Usuário não encontrado")

    old_goal = user.monthly_goal or 0.0

    # Se havia meta anterior, registra no histórico
    if old_goal > 0:
        today = date.today()
        month_names = {1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
                       7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'}
        month_ref = f"{month_names[today.month]}/{str(today.year)[-2:]}"

        # Calcula receita do mês atual
        current_month_first_day = today.replace(day=1)
        current_revenue_result = db.query(
            func.coalesce(func.sum(Appointment.price), 0)
        ).filter(
            Appointment.user_id == user_id,
            Appointment.status == 'completed',
            Appointment.price.isnot(None),
            Appointment.date >= current_month_first_day,
        ).scalar()
        current_revenue = float(current_revenue_result) if current_revenue_result else 0.0

        achieved = current_revenue >= old_goal

        history_entry = GoalHistory(
            user_id=user_id,
            goal_value=old_goal,
            achieved=achieved,
            revenue_at_close=current_revenue,
            month_ref=month_ref,
        )
        db.add(history_entry)

    # Atualiza meta do usuário
    user.monthly_goal = new_goal
    db.commit()
    db.refresh(user)

    return user.monthly_goal


def get_goal_history(db: Session, user_id: int) -> list:
    """Retorna o histórico de metas do usuário, mais recente primeiro."""
    return (
        db.query(GoalHistory)
        .filter(GoalHistory.user_id == user_id)
        .order_by(desc(GoalHistory.created_at))
        .all()
    )


def clear_goal_history(db: Session, user_id: int) -> int:
    """Limpa todo o histórico de metas do usuário. Retorna quantas foram removidas."""
    count = db.query(GoalHistory).filter(GoalHistory.user_id == user_id).delete()
    db.commit()
    return count


def generate_financial_projection(db: Session, user_id: int, goal: float, force_refresh: bool = False) -> str:
    """Gera projeção financeira usando Gemini com base na meta e receita atual.
    Usa cache em memória de 30 min para evitar chamadas repetidas à API."""
    global _projection_cache

    # Verificar cache (a menos que force_refresh)
    if not force_refresh and user_id in _projection_cache:
        return _projection_cache[user_id]

    from app.services.gemini_service import gemini_client
    from google.genai import types

    if not gemini_client:
        return "Erro: A chave do Gemini (GEMINI_API_KEY) não está configurada no servidor."

    today = date.today()
    current_month_first_day = today.replace(day=1)

    # Receita concluída no mês
    completed_revenue_result = db.query(
        func.coalesce(func.sum(Appointment.price), 0)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'completed',
        Appointment.price.isnot(None),
        Appointment.date >= current_month_first_day,
    ).scalar()
    completed_revenue = float(completed_revenue_result) if completed_revenue_result else 0.0

    # Ticket médio
    avg_ticket_result = db.query(
        func.avg(Appointment.price)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'completed',
        Appointment.price.isnot(None),
        Appointment.price > 0,
    ).scalar()
    avg_ticket = round(float(avg_ticket_result), 2) if avg_ticket_result else 0.0

    # Pendentes do mês
    pending_count = db.query(Appointment).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'pending',
        Appointment.date >= current_month_first_day,
    ).count()

    pending_revenue_result = db.query(
        func.coalesce(func.sum(func.coalesce(Appointment.price, avg_ticket)), 0)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'pending',
        Appointment.date >= current_month_first_day,
    ).scalar()
    pending_revenue = float(pending_revenue_result) if pending_revenue_result else 0.0

    projected = completed_revenue + pending_revenue
    days_passed = (today - current_month_first_day).days + 1
    import calendar
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_remaining = days_in_month - days_passed

    def fmt_brl(v):
        return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    prompt = f"""
Você é um consultor financeiro do sistema Velo. Analise a situação financeira do mês e gere uma projeção CONCISA.

Dados do mês atual ({today.strftime('%B/%Y')}):
- Meta definida: {fmt_brl(goal)}
- Receita concluída até agora: {fmt_brl(completed_revenue)}
- Agendamentos pendentes no mês: {pending_count} (estimativa de receita: {fmt_brl(pending_revenue)})
- Projeção simples (concluído + pendente): {fmt_brl(projected)}
- Ticket médio geral: {fmt_brl(avg_ticket)}
- Dias passados no mês: {days_passed} de {days_in_month}
- Dias restantes: {days_remaining}

Formate assim (em Markdown):

### 📊 Projeção do Mês
- Análise rápida (1-2 frases) sobre se a meta será batida ou não

### 💡 Recomendações
- 2 a 3 dicas práticas para atingir/superar a meta

Regras:
- Seja direto e conciso
- Use **negrito** para dados importantes
- Use emojis pontuais
- Se a meta já foi batida, parabenize e sugira próximos passos
"""

    try:
        response = gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Você é um consultor financeiro do sistema Velo. Seja conciso e direto.",
            ),
        )
        result = response.text
        # Salvar no cache
        _projection_cache[user_id] = result
        return result
    except Exception as e:
        return f"Não foi possível gerar a projeção agora. Tente novamente mais tarde."


def invalidate_projection_cache(user_id: int) -> None:
    """Invalida o cache de projeção de um usuário (ex: ao salvar nova meta)."""
    _projection_cache.pop(user_id, None)
