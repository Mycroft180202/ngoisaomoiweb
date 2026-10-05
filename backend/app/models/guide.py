from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class TourGuide(Base):
    __tablename__ = "tour_guides"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    bio = Column(String, nullable=True)

    tours = relationship("Tour", foreign_keys="[Tour.guide_id]", back_populates="guide")
    tours_many = relationship("Tour", secondary="tour_guide_association", back_populates="guides")
