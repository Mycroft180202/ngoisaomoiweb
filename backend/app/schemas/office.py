from pydantic import BaseModel
from typing import Optional

class RepresentativeOfficeBase(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    hotline: Optional[str] = None
    email: Optional[str] = None
    order_index: Optional[int] = 0

class RepresentativeOfficeCreate(RepresentativeOfficeBase):
    pass

class RepresentativeOfficeUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    hotline: Optional[str] = None
    email: Optional[str] = None
    order_index: Optional[int] = None

class RepresentativeOfficeResponse(RepresentativeOfficeBase):
    id: int

    class Config:
        from_attributes = True
