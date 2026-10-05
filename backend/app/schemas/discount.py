from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DiscountBase(BaseModel):
    code: str
    discount_type: str  # "percentage" or "fixed"
    value: float
    min_value: Optional[float] = 0.0
    max_uses: Optional[int] = 0
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = True

class DiscountCreate(DiscountBase):
    pass

class DiscountUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[float] = None
    min_value: Optional[float] = None
    max_uses: Optional[int] = None
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class DiscountResponse(DiscountBase):
    id: int
    used_count: int

    class Config:
        from_attributes = True
