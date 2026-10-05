from sqlalchemy import Column, Integer, String
from app.core.database import Base

class RepresentativeOffice(Base):
    __tablename__ = "representative_offices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    hotline = Column(String, nullable=True)
    email = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
