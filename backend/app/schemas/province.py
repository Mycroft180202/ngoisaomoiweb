from pydantic import BaseModel
from typing import Optional
from app.schemas.country import CountryResponse

class ProvinceBase(BaseModel):
    name: str
    slug: str
    image: Optional[str] = None
    region: Optional[str] = None
    country_id: int

class ProvinceCreate(ProvinceBase):
    pass

class ProvinceResponse(ProvinceBase):
    id: int
    country: Optional[CountryResponse] = None

    class Config:
        from_attributes = True
