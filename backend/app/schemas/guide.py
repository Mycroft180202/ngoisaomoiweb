from pydantic import BaseModel
from typing import Optional

class GuideBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None

class GuideCreate(GuideBase):
    pass

class GuideResponse(GuideBase):
    id: int

    class Config:
        from_attributes = True
