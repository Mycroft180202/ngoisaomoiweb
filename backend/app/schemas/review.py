from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReviewBase(BaseModel):
    tour_id: int
    customer_name: str
    rating: float
    comment: Optional[str] = None
    is_approved: Optional[bool] = True

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
