from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class TourReview(Base):
    __tablename__ = "tour_reviews"

    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("tours.id", ondelete="CASCADE"), nullable=False)
    customer_name = Column(String, nullable=False)
    rating = Column(Float, nullable=False, default=5.0)
    comment = Column(String, nullable=True)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tour = relationship("Tour", back_populates="reviews")
