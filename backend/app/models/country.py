from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    image = Column(String, nullable=True)
    continent = Column(String, nullable=True)

    provinces = relationship("ProvinceCity", back_populates="country", cascade="all, delete-orphan")
    tours = relationship("Tour", foreign_keys="[Tour.country_id]", back_populates="country")
