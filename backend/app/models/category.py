from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class TourCategory(Base):
    __tablename__ = "tour_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    tours = relationship("Tour", foreign_keys="Tour.category_id", back_populates="tour_category")
    tours_many = relationship("Tour", secondary="tour_category_association", back_populates="categories")
