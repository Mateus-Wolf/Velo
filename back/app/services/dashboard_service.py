from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, desc
import sqlalchemy as sa
from collections import defaultdict
from app.models.client import Client
from app.models.appointment import Appointment
from app.models.workplace import Workplace
from app.models.workplace_client import WorkplaceClient

def get_dashboard_metrics(db: Session, user_id: int):
    # Top 3 clientes que mais vão
    top_clients = (
        db.query(
            Client.id.label("client_id"),
            Client.name.label("client_name"),
            func.count(Appointment.id).label("appointment_count")
        )
        .join(Appointment, Client.id == Appointment.client_id)
        .filter(Appointment.user_id == user_id, Appointment.status != 'canceled')
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
        .filter(Appointment.user_id == user_id, Appointment.status != 'canceled')
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
    # PostgreSQL extract('dow', date) returns 0 for Sunday to 6 for Saturday
    appointments_by_dow = (
        db.query(
            extract('dow', Appointment.date).label('day_num'),
            func.count(Appointment.id).label('app_count')
        )
        .filter(Appointment.user_id == user_id, Appointment.status != 'canceled')
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
    # Extrai só a hora do tempo de início para agrupar
    appointments_by_hour = (
        db.query(
            extract('hour', Appointment.start_time).label('hour'),
            func.count(Appointment.id).label('app_count')
        )
        .filter(Appointment.user_id == user_id, Appointment.status != 'canceled')
        .group_by(extract('hour', Appointment.start_time))
        .all()
    )
    
    # Agrupa por períodos em listas ordenadas de strings para o gráfico
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

    # Canceled count
    canceled_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'canceled'
    ).count()

    # Rescheduled count
    rescheduled_count = db.query(Appointment).filter(
        Appointment.user_id == user_id, 
        Appointment.status == 'rescheduled'
    ).count()

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
        "canceled_count": canceled_count,
        "rescheduled_count": rescheduled_count
    }
