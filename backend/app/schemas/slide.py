from pydantic import BaseModel
from typing import Optional

class CarouselSlideBase(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: str
    tour_image_url: Optional[str] = None
    link_url: Optional[str] = None
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True

class CarouselSlideCreate(CarouselSlideBase):
    pass

class CarouselSlideUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    tour_image_url: Optional[str] = None
    link_url: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class CarouselSlideResponse(CarouselSlideBase):
    id: int

    class Config:
        from_attributes = True
