from concurrent.futures import ThreadPoolExecutor
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, extract, desc, and_
from sqlalchemy.orm import Session

from app.database import ReadSessionLocal
from app.models.client import Client
from app.models.appointment import Appointment
from app.models.workplace import Workplace
from app.models.workplace_client import WorkplaceClient
from app.models.user import User

# Status que devem ser excluídos de métricas de performance
EXCLUDED_STATUSES = ["canceled_client", "canceled_user", "no_show"]

MONTH_NAMES = {1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
               7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'}
DAY_NAMES = {0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'}


# ---------------------------------------------------------------------------
# Consultas individuais.
# Cada uma recebe sua própria sessão porque rodam em paralelo (sessões do
# SQLAlchemy não são thread-safe). O banco é remoto, então o tempo total é
# dominado por round-trips: em paralelo o custo cai de N*RTT para ~1*RTT.
# ---------------------------------------------------------------------------

def _q_top_clients(db: Session, user_id: int):
    return (
        db.query(
            Client.id.label("client_id"),
            Client.name.label("client_name"),
            func.count(Appointment.id).label("appointment_count")
        )
        .join(Appointment, Client.id == Appointment.client_id)
        .filter(Appointment.user_id == user_id, ~Appointment.status.in_(EXCLUDED_STATUSES))
        .group_by(Client.id)
        .order_by(desc("appointment_count"))
        .limit(3)
        .all()
    )


def _q_longest_appointments(db: Session, user_id: int):
    rows = (
        db.query(
            Appointment.id.label("appointment_id"),
            Client.name.label("client_name"),
            Appointment.date,
            (
                extract('epoch', Appointment.end_time) - extract('epoch', Appointment.start_time)
            ).label("duration_seconds")
        )
        .join(Client, Appointment.client_id == Client.id)
        .filter(Appointment.user_id == user_id, ~Appointment.status.in_(EXCLUDED_STATUSES))
        .order_by(desc("duration_seconds"))
        .limit(3)
        .all()
    )
    return [
        {
            "appointment_id": appt.appointment_id,
            "client_name": appt.client_name,
            "duration_minutes": int(appt.duration_seconds / 60) if appt.duration_seconds else 0,
            "date": str(appt.date)
        }
        for appt in rows
    ]


def _q_top_workplaces(db: Session, user_id: int):
    return (
        db.query(
            Workplace.id.label("workplace_id"),
            Workplace.name.label("workplace_name"),
            func.count(WorkplaceClient.client_id).label("client_count")
        )
        .join(WorkplaceClient, Workplace.id == WorkplaceClient.workplace_id)
        .filter(Workplace.user_id == user_id)
        .group_by(Workplace.id)
        .order_by(desc("client_count"))
        .limit(3)
        .all()
    )


def _q_by_day_of_week(db: Session, user_id: int):
    rows = (
        db.query(
            extract('dow', Appointment.date).label('day_num'),
            func.count(Appointment.id).label('app_count')
        )
        .filter(Appointment.user_id == user_id, ~Appointment.status.in_(EXCLUDED_STATUSES))
        .group_by(extract('dow', Appointment.date))
        .all()
    )
    days_data = {v: 0 for v in DAY_NAMES.values()}
    for row in rows:
        day_idx = int(row.day_num)
        if day_idx in DAY_NAMES:
            days_data[DAY_NAMES[day_idx]] = row.app_count
    return [{"day_name": k, "count": v} for k, v in days_data.items()]


def _q_by_time_range(db: Session, user_id: int):
    rows = (
        db.query(
            extract('hour', Appointment.start_time).label('hour'),
            func.count(Appointment.id).label('app_count')
        )
        .filter(Appointment.user_id == user_id, ~Appointment.status.in_(EXCLUDED_STATUSES))
        .group_by(extract('hour', Appointment.start_time))
        .all()
    )
    time_data = {
        "06h-09h": 0,
        "09h-12h": 0,
        "12h-15h": 0,
        "15h-18h": 0,
        "18h-21h": 0,
    }
    for row in rows:
        h = int(row.hour)
        if 6 <= h < 9: time_data["06h-09h"] += row.app_count
        elif 9 <= h < 12: time_data["09h-12h"] += row.app_count
        elif 12 <= h < 15: time_data["12h-15h"] += row.app_count
        elif 15 <= h < 18: time_data["15h-18h"] += row.app_count
        elif 18 <= h < 21: time_data["18h-21h"] += row.app_count
    return [{"time_range": k, "count": v} for k, v in time_data.items()]


def _q_summary(db: Session, user_id: int):
    """Todas as contagens/somas escalares em UMA única consulta (FILTER do PostgreSQL)."""
    month_start = date.today().replace(day=1)
    completed = Appointment.status == 'completed'
    priced = and_(completed, Appointment.price.isnot(None), Appointment.price > 0)
    pending_this_month = and_(Appointment.status == 'pending', Appointment.date >= month_start)

    return (
        db.query(
            func.count(Appointment.id).filter(Appointment.status == 'canceled_client').label('canceled_client'),
            func.count(Appointment.id).filter(Appointment.status == 'canceled_user').label('canceled_user'),
            func.count(Appointment.id).filter(Appointment.status == 'no_show').label('no_show'),
            func.count(Appointment.id).filter(completed).label('completed'),
            func.count(Appointment.id).filter(Appointment.status == 'pending').label('pending'),
            func.count(Appointment.id).filter(Appointment.rescheduled == True).label('rescheduled'),  # noqa: E712
            func.coalesce(
                func.sum(func.coalesce(Appointment.paid_value, Appointment.price)).filter(completed), 0
            ).label('total_revenue'),
            func.avg(Appointment.price).filter(priced).label('avg_ticket'),
            func.count(Appointment.id).filter(priced).label('priced_count'),
            # Projeção: soma dos preços pendentes do mês + quantidade sem preço (valorizada pelo ticket médio)
            func.coalesce(
                func.sum(Appointment.price).filter(and_(pending_this_month, Appointment.price.isnot(None))), 0
            ).label('pending_priced_sum'),
            func.count(Appointment.id).filter(and_(pending_this_month, Appointment.price.is_(None))).label('pending_unpriced'),
        )
        .filter(Appointment.user_id == user_id)
        .one()
    )


def _q_monthly_revenue(db: Session, user_id: int, first_day: date):
    rows = (
        db.query(
            extract('year', Appointment.date).label('yr'),
            extract('month', Appointment.date).label('mo'),
            func.coalesce(func.sum(Appointment.price), 0).label('revenue'),
        )
        .filter(
            Appointment.user_id == user_id,
            Appointment.status == 'completed',
            Appointment.price.isnot(None),
            Appointment.date >= first_day,
        )
        .group_by('yr', 'mo')
        .order_by('yr', 'mo')
        .all()
    )
    return {(int(r.yr), int(r.mo)): float(r.revenue) for r in rows}


def _q_top_clients_revenue(db: Session, user_id: int):
    return (
        db.query(
            Client.name.label("client_name"),
            func.sum(Appointment.price).label("total_revenue"),
            func.count(Appointment.id).label("appointment_count"),
        )
        .join(Appointment, Client.id == Appointment.client_id)
        .filter(
            Appointment.user_id == user_id,
            Appointment.status == 'completed',
            Appointment.price.isnot(None),
            Appointment.price > 0,
        )
        .group_by(Client.id)
        .order_by(desc("total_revenue"))
        .limit(3)
        .all()
    )


def _q_goal(db: Session, user_id: int):
    return db.query(User.monthly_goal).filter(User.id == user_id).scalar() or 0.0


def _in_own_session(fn, *args):
    """Executa uma consulta em sessão própria (para uso em threads)."""
    db = ReadSessionLocal()
    try:
        return fn(db, *args)
    finally:
        db.close()


def get_dashboard_metrics(db: Session, user_id: int):
    # `db` é mantido na assinatura por compatibilidade; as consultas rodam em
    # sessões próprias, em paralelo.
    today = date.today()
    first_day = (today - relativedelta(months=5)).replace(day=1)

    with ThreadPoolExecutor(max_workers=9) as pool:
        f_top_clients = pool.submit(_in_own_session, _q_top_clients, user_id)
        f_longest = pool.submit(_in_own_session, _q_longest_appointments, user_id)
        f_top_wp = pool.submit(_in_own_session, _q_top_workplaces, user_id)
        f_dow = pool.submit(_in_own_session, _q_by_day_of_week, user_id)
        f_hour = pool.submit(_in_own_session, _q_by_time_range, user_id)
        f_summary = pool.submit(_in_own_session, _q_summary, user_id)
        f_monthly = pool.submit(_in_own_session, _q_monthly_revenue, user_id, first_day)
        f_top_rev = pool.submit(_in_own_session, _q_top_clients_revenue, user_id)
        f_goal = pool.submit(_in_own_session, _q_goal, user_id)

        top_clients = f_top_clients.result()
        formatted_longest = f_longest.result()
        top_workplaces = f_top_wp.result()
        formatted_days = f_dow.result()
        formatted_times = f_hour.result()
        s = f_summary.result()
        monthly_lookup = f_monthly.result()
        top_clients_revenue = f_top_rev.result()
        user_goal = f_goal.result()

    # ---- Métricas Financeiras ----
    total_revenue = float(s.total_revenue) if s.total_revenue else 0.0
    avg_ticket = round(float(s.avg_ticket), 2) if s.avg_ticket else 0.0

    # Receita mensal (últimos 6 meses)
    monthly_revenue = []
    cursor = first_day
    for _ in range(6):
        y, m = cursor.year, cursor.month
        monthly_revenue.append({
            "month": f"{MONTH_NAMES[m]}/{str(y)[-2:]}",
            "revenue": monthly_lookup.get((y, m), 0.0),
        })
        cursor += relativedelta(months=1)

    # ---------------- PROJEÇÕES ----------------
    pending_revenue = float(s.pending_priced_sum or 0) + avg_ticket * s.pending_unpriced
    current_month_revenue = monthly_revenue[-1]['revenue'] if monthly_revenue else 0.0
    projected_revenue = current_month_revenue + pending_revenue

    return {
        "top_clients": [
            {"client_id": c.client_id, "client_name": c.client_name, "appointment_count": c.appointment_count}
            for c in top_clients
        ],
        "longest_appointments": formatted_longest,
        "top_workplaces": [
            {"workplace_id": w.workplace_id, "workplace_name": w.workplace_name, "client_count": w.client_count}
            for w in top_workplaces
        ],
        "appointments_by_day": formatted_days,
        "appointments_by_time": formatted_times,
        "canceled_client_count": s.canceled_client,
        "canceled_user_count": s.canceled_user,
        "no_show_count": s.no_show,
        "completed_count": s.completed,
        "pending_count": s.pending,
        "rescheduled_count": s.rescheduled,
        "total_revenue": total_revenue,
        "avg_ticket": avg_ticket,
        "total_priced_appointments": s.priced_count,
        "current_month_revenue": current_month_revenue,
        "projected_revenue": projected_revenue,
        "monthly_goal": user_goal,
        "monthly_revenue": monthly_revenue,
        "top_clients_revenue": [
            {"client_name": c.client_name, "total_revenue": float(c.total_revenue), "appointment_count": c.appointment_count}
            for c in top_clients_revenue
        ],
    }
