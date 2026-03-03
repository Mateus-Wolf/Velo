from pydantic import BaseModel
from typing import List

class TopClientSchema(BaseModel):
    client_id: int
    client_name: str
    appointment_count: int

class LongestAppointmentSchema(BaseModel):
    appointment_id: int
    client_name: str
    duration_minutes: int
    date: str

class TopWorkplaceSchema(BaseModel):
    workplace_id: int
    workplace_name: str
    client_count: int

class DayOfWeekStatSchema(BaseModel):
    day_name: str
    count: int

class TimeOfDayStatSchema(BaseModel):
    time_range: str
    count: int

class StatusCountSchema(BaseModel):
    status: str
    count: int

class MonthlyRevenueSchema(BaseModel):
    month: str
    revenue: float

class TopClientRevenueSchema(BaseModel):
    client_name: str
    total_revenue: float
    appointment_count: int

class DashboardMetricsResponse(BaseModel):
    top_clients: List[TopClientSchema]
    longest_appointments: List[LongestAppointmentSchema]
    top_workplaces: List[TopWorkplaceSchema]
    appointments_by_day: List[DayOfWeekStatSchema]
    appointments_by_time: List[TimeOfDayStatSchema]
    canceled_client_count: int
    canceled_user_count: int
    no_show_count: int
    completed_count: int
    pending_count: int
    rescheduled_count: int
    total_revenue: float
    avg_ticket: float
    total_priced_appointments: int
    monthly_revenue: List[MonthlyRevenueSchema]
    top_clients_revenue: List[TopClientRevenueSchema]

class AIInsightResponse(BaseModel):
    insight: str
