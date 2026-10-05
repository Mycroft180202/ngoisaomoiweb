from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class TourDuration(Base):
    __tablename__ = "tour_durations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g., "3 ngày 2 đêm"
    days = Column(Integer, nullable=False)
    nights = Column(Integer, nullable=False)

    tours = relationship("Tour", back_populates="tour_duration")
