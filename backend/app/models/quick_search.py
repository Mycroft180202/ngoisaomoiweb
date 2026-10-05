from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class QuickSearch(Base):
    __tablename__ = "quick_searches"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, unique=True, index=True, nullable=False)
    link_url = Column(String, nullable=False)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
