from typing import Optional

from pydantic import BaseModel


# ---------- Preferências de Notificação ----------

class NotificationPreferenceResponse(BaseModel):
    """Preferências de notificação do usuário."""
    notify_30_min_before: bool = False
    notify_1_day_before: bool = False
    notify_2_days_before: bool = False

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdate(BaseModel):
    """Atualização de preferências de notificação."""
    notify_30_min_before: Optional[bool] = None
    notify_1_day_before: Optional[bool] = None
    notify_2_days_before: Optional[bool] = None
