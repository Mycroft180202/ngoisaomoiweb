from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Attraction(Base):
    __tablename__ = "attractions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    province_id = Column(Integer, ForeignKey("province_cities.id", ondelete="CASCADE"), nullable=False)

    province = relationship("ProvinceCity", back_populates="attractions")
