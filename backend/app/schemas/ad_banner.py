from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AdBannerBase(BaseModel):
    title: Optional[str] = None
    image_url: str
    media_type: str = "image"
    media_url: Optional[str] = None
    poster_url: Optional[str] = None
    link_url: Optional[str] = None
    position: Optional[str] = "home_sidebar"
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True
    autoplay: bool = True
    muted: bool = True
    loop: bool = True
    show_close_button: bool = True
    open_in_new_tab: bool = True
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class AdBannerCreate(AdBannerBase):
    pass

class AdBannerUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    media_type: Optional[str] = None
    media_url: Optional[str] = None
    poster_url: Optional[str] = None
    link_url: Optional[str] = None
    position: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    autoplay: Optional[bool] = None
    muted: Optional[bool] = None
    loop: Optional[bool] = None
    show_close_button: Optional[bool] = None
    open_in_new_tab: Optional[bool] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class AdBannerResponse(AdBannerBase):
    id: int

    class Config:
        from_attributes = True
