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

class DashboardMetricsResponse(BaseModel):
    top_clients: List[TopClientSchema]
    longest_appointments: List[LongestAppointmentSchema]
    top_workplaces: List[TopWorkplaceSchema]
    appointments_by_day: List[DayOfWeekStatSchema]
    appointments_by_time: List[TimeOfDayStatSchema]
    canceled_count: int
    rescheduled_count: int

class AIInsightResponse(BaseModel):
    insight: str
