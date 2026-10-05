from pydantic import BaseModel
from typing import Any
from datetime import datetime

class SystemSettingBase(BaseModel):
    key: str
    value: Any

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingResponse(SystemSettingBase):
    updated_at: datetime

    class Config:
        from_attributes = True
