from pydantic import BaseModel
from typing import Optional
from app.schemas.province import ProvinceResponse

class AttractionBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    province_id: int

class AttractionCreate(AttractionBase):
    pass

class AttractionResponse(AttractionBase):
    id: int
    province: Optional[ProvinceResponse] = None

    class Config:
        from_attributes = True
