from pydantic import BaseModel
from typing import Optional

class NewsCategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None

class NewsCategoryCreate(NewsCategoryBase):
    pass

class NewsCategoryResponse(NewsCategoryBase):
    id: int

    class Config:
        from_attributes = True

class NewsTagBase(BaseModel):
    name: str
    slug: str

class NewsTagCreate(NewsTagBase):
    pass

class NewsTagResponse(NewsTagBase):
    id: int

    class Config:
        from_attributes = True
