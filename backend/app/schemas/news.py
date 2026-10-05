from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.news_category import NewsCategoryResponse, NewsTagResponse

class NewsBase(BaseModel):
    slug: str
    title: str
    summary: Optional[str] = None
    content: str
    image: Optional[str] = None
    video_url: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = "Admin"
    category_id: Optional[int] = None

class NewsCreate(NewsBase):
    tag_ids: Optional[List[int]] = []

class NewsUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image: Optional[str] = None
    video_url: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None

class NewsResponse(NewsBase):
    id: int
    created_at: datetime
    category_rel: Optional[NewsCategoryResponse] = None
    tags: Optional[List[NewsTagResponse]] = []

    class Config:
        from_attributes = True
