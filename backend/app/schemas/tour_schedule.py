from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import date

class TourScheduleBase(BaseModel):
    departure_date: date
    # Sức chứa phụ thuộc từng chuyến; không tự mặc định 30 để tránh bán quá chỗ.
    max_capacity: int = Field(..., ge=1, le=5000)
    booked_seats: int = Field(default=0, ge=0, le=5000)
    actual_cost: Optional[float] = Field(default=None, ge=0)
    status: Literal["active", "locked", "cancelled"] = "active"

class TourScheduleCreate(TourScheduleBase):
    tour_id: int

class TourScheduleUpdate(BaseModel):
    departure_date: Optional[date] = None
    max_capacity: Optional[int] = Field(default=None, ge=1, le=5000)
    booked_seats: Optional[int] = Field(default=None, ge=0, le=5000)
    actual_cost: Optional[float] = Field(default=None, ge=0)
    status: Optional[Literal["active", "locked", "cancelled"]] = None

class TourScheduleResponse(TourScheduleBase):
    id: int
    tour_id: int
    departure_code: Optional[str] = None
    crm_departure_id: Optional[str] = None

    class Config:
        from_attributes = True
