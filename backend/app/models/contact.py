from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    message = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
