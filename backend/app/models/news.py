from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(String, nullable=True)
    content = Column(String, nullable=False)
    image = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    category = Column(String, nullable=True)  # e.g., Cẩm nang du lịch, Tin tức sự kiện (legacy, nullable now)
    author = Column(String, default="Admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relational associations
    category_id = Column(Integer, ForeignKey("news_categories.id", ondelete="SET NULL"), nullable=True)
    category_rel = relationship("NewsCategory", back_populates="news")
    tags = relationship("NewsTag", secondary="news_tag_association", back_populates="news", lazy="selectin")
