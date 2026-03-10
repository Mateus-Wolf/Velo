from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, desc
import sqlalchemy as sa
from collections import defaultdict
from app.models.client import Client
from app.models.appointment import Appointment
from app.models.workplace import Workplace
from app.models.workplace_client import WorkplaceClient

# Status que devem ser excluídos de métricas de performance
EXCLUDED_STATUSES = ["canceled_client", "canceled_user", "no_show"]

def get_dashboard_metrics(db: Session, user_id: int):
    # Top 3 clientes que mais vão
    top_clients = (
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

    # Top 3 atendimentos mais demorados
    longest_appointments = (
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
    
    formatted_longest = [
        {
            "appointment_id": appt.appointment_id,
            "client_name": appt.client_name,
            "duration_minutes": int(appt.duration_seconds / 60) if appt.duration_seconds else 0,
            "date": str(appt.date)
        }
        for appt in longest_appointments
    ]

    # Top 3 locais com mais clientes
    top_workplaces = (
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

    # Gráfico dia da semana
    appointments_by_dow = (
        db.query(
            extract('dow', Appointment.date).label('day_num'),
            func.count(Appointment.id).label('app_count')
        )
        .filter(Appointment.user_id == user_id, ~Appointment.status.in_(EXCLUDED_STATUSES))
        .group_by(extract('dow', Appointment.date))
        .all()
    )

    day_names = {0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'}
    days_data = {v: 0 for v in day_names.values()}
    
    for row in appointments_by_dow:
        day_idx = int(row.day_num)
        if day_idx in day_names:
            days_data[day_names[day_idx]] = row.app_count
            
    formatted_days = [{"day_name": k, "count": v} for k, v in days_data.items()]

    # Gráfico de horários
    appointments_by_hour = (
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
    for row in appointments_by_hour:
        h = int(row.hour)
        if 6 <= h < 9: time_data["06h-09h"] += row.app_count
        elif 9 <= h < 12: time_data["09h-12h"] += row.app_count
        elif 12 <= h < 15: time_data["12h-15h"] += row.app_count
        elif 15 <= h < 18: time_data["15h-18h"] += row.app_count
        elif 18 <= h < 21: time_data["18h-21h"] += row.app_count
        
    formatted_times = [{"time_range": k, "count": v} for k, v in time_data.items()]

    # ----- Contagens por status -----
    canceled_client_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'canceled_client'
    ).count()

    canceled_user_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'canceled_user'
    ).count()

    no_show_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'no_show'
    ).count()

    completed_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'completed'
    ).count()

    pending_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'pending'
    ).count()

    rescheduled_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.rescheduled == True
    ).count()

    # ---- Métricas Financeiras ----
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta

    # Receita total (apenas agendamentos concluídos com preço)
    total_revenue_result = db.query(
        func.coalesce(func.sum(Appointment.price), 0)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'completed',
        Appointment.price.isnot(None),
    ).scalar()
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0

    # Ticket médio (apenas concluídos)
    avg_ticket_result = db.query(
        func.avg(Appointment.price)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'completed',
        Appointment.price.isnot(None),
        Appointment.price > 0,
    ).scalar()
    avg_ticket = round(float(avg_ticket_result), 2) if avg_ticket_result else 0.0

    # Total de agendamentos concluídos com preço preenchido
    total_priced_appointments = db.query(Appointment).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'completed',
        Appointment.price.isnot(None),
        Appointment.price > 0,
    ).count()

    # Receita mensal (últimos 6 meses)
    today = date.today()
    six_months_ago = today - relativedelta(months=5)
    first_day = six_months_ago.replace(day=1)

    monthly_revenue_rows = (
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

    month_names = {1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
                   7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'}

    monthly_lookup = {(int(r.yr), int(r.mo)): float(r.revenue) for r in monthly_revenue_rows}
    monthly_revenue = []
    cursor = first_day
    for _ in range(6):
        y, m = cursor.year, cursor.month
        monthly_revenue.append({
            "month": f"{month_names[m]}/{str(y)[-2:]}",
            "revenue": monthly_lookup.get((y, m), 0.0),
        })
        cursor += relativedelta(months=1)

    # Top 3 clientes por receita (apenas concluídos)
    top_clients_revenue = (
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

    # ---------------- PROJEÇÕES ----------------
    from app.models.user import User
    user_goal = db.query(User.monthly_goal).filter(User.id == user_id).scalar() or 0.0

    current_month_first_day = today.replace(day=1)
    
    pending_revenue_result = db.query(
        func.coalesce(func.sum(func.coalesce(Appointment.price, avg_ticket)), 0)
    ).filter(
        Appointment.user_id == user_id,
        Appointment.status == 'pending',
        Appointment.date >= current_month_first_day
    ).scalar()
    pending_revenue = float(pending_revenue_result) if pending_revenue_result else 0.0

    current_month_revenue = monthly_revenue[-1]['revenue'] if monthly_revenue else 0.0
    projected_revenue = current_month_revenue + pending_revenue
    # -------------------------------------------

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
        "canceled_client_count": canceled_client_count,
        "canceled_user_count": canceled_user_count,
        "no_show_count": no_show_count,
        "completed_count": completed_count,
        "pending_count": pending_count,
        "rescheduled_count": rescheduled_count,
        "total_revenue": total_revenue,
        "avg_ticket": avg_ticket,
        "total_priced_appointments": total_priced_appointments,
        "current_month_revenue": current_month_revenue,
        "projected_revenue": projected_revenue,
        "monthly_goal": user_goal,
        "monthly_revenue": monthly_revenue,
        "top_clients_revenue": [
            {"client_name": c.client_name, "total_revenue": float(c.total_revenue), "appointment_count": c.appointment_count}
            for c in top_clients_revenue
        ],
    }
