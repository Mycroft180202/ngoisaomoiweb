from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    icon_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
