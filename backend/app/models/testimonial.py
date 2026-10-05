from sqlalchemy import Column, Integer, String, Float, Boolean
from app.core.database import Base

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_role = Column(String, nullable=True)  # e.g., Du khách từ Hà Nội, Doanh nhân
    avatar_url = Column(String, nullable=True)
    rating = Column(Float, default=5.0)
    comment = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
