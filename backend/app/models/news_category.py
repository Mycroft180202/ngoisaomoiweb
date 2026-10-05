from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

news_tag_association = Table(
    "news_tag_association",
    Base.metadata,
    Column("news_id", Integer, ForeignKey("news.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("news_tags.id", ondelete="CASCADE"), primary_key=True)
)

class NewsCategory(Base):
    __tablename__ = "news_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    news = relationship("News", back_populates="category_rel")

class NewsTag(Base):
    __tablename__ = "news_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)

    news = relationship("News", secondary=news_tag_association, back_populates="tags")
