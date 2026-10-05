from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ProvinceCity(Base):
    __tablename__ = "province_cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    image = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False)

    country = relationship("Country", back_populates="provinces")
    attractions = relationship("Attraction", back_populates="province", cascade="all, delete-orphan")
    tours = relationship("Tour", foreign_keys="[Tour.province_id]", back_populates="province")
