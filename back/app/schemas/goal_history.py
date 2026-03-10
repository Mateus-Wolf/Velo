from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class GoalHistoryItem(BaseModel):
    id: int
    goal_value: float
    achieved: bool
    revenue_at_close: float
    month_ref: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GoalHistoryListResponse(BaseModel):
    history: List[GoalHistoryItem]


class SetGoalRequest(BaseModel):
    goal_value: float


class SetGoalResponse(BaseModel):
    monthly_goal: float
    message: str


class FinancialProjectionResponse(BaseModel):
    projection: str
