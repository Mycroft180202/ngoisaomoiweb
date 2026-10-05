from pydantic import BaseModel
from typing import Optional

class CountryBase(BaseModel):
    name: str
    slug: str
    image: Optional[str] = None
    continent: Optional[str] = None

class CountryCreate(CountryBase):
    pass

class CountryResponse(CountryBase):
    id: int

    class Config:
        from_attributes = True
