from pydantic import BaseModel
from typing import Optional

class TestimonialBase(BaseModel):
    customer_name: str
    customer_role: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = 5.0
    comment: str
    is_active: Optional[bool] = True

class TestimonialCreate(TestimonialBase):
    pass

class TestimonialUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_role: Optional[str] = None
    avatar_url: Optional[str] = None
    rating: Optional[float] = None
    comment: Optional[str] = None
    is_active: Optional[bool] = None

class TestimonialResponse(TestimonialBase):
    id: int

    class Config:
        from_attributes = True
