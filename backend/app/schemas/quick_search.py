from pydantic import BaseModel
from typing import Optional

class QuickSearchBase(BaseModel):
    keyword: str
    link_url: str
    order_index: Optional[int] = 0
    is_active: Optional[bool] = True

class QuickSearchCreate(QuickSearchBase):
    pass

class QuickSearchResponse(QuickSearchBase):
    id: int

    class Config:
        from_attributes = True
