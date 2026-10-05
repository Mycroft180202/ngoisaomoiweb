from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    bank_name = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    branch = Column(String, nullable=True)
    qr_code_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
