from pydantic import BaseModel
from typing import Optional

class BankAccountBase(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    branch: Optional[str] = None
    qr_code_url: Optional[str] = None
    is_active: Optional[bool] = True

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    branch: Optional[str] = None
    qr_code_url: Optional[str] = None
    is_active: Optional[bool] = None

class BankAccountResponse(BankAccountBase):
    id: int

    class Config:
        from_attributes = True
