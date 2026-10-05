from pydantic import BaseModel
from typing import Optional, List

class NavigationMenuBase(BaseModel):
    title: str
    url: str
    parent_id: Optional[int] = None
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True

class NavigationMenuCreate(NavigationMenuBase):
    pass

class NavigationMenuUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    parent_id: Optional[int] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None

class NavigationMenuResponse(NavigationMenuBase):
    id: int
    children: List['NavigationMenuResponse'] = []

    class Config:
        from_attributes = True
