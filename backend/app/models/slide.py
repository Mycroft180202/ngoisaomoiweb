from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class CarouselSlide(Base):
    __tablename__ = "carousel_slides"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    subtitle = Column(String, nullable=True)
    image_url = Column(String, nullable=False)
    tour_image_url = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
