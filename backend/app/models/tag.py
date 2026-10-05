from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

tour_tag_association = Table(
    "tour_tag_association",
    Base.metadata,
    Column("tour_id", Integer, ForeignKey("tours.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tour_tags.id", ondelete="CASCADE"), primary_key=True)
)

class TourTag(Base):
    __tablename__ = "tour_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)

    tours = relationship("Tour", secondary=tour_tag_association, back_populates="tags")
