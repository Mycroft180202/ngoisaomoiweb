from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentTransactionBase(BaseModel):
    booking_id: int
    amount: float
    payment_method: str = "bank_transfer"
    bank_account_id: Optional[int] = None
    notes: Optional[str] = None

class PaymentTransactionCreate(PaymentTransactionBase):
    pass

class PaymentTransactionUpdate(BaseModel):
    status: Optional[str] = None
    bank_transaction_id: Optional[str] = None
    bank_transaction_time: Optional[datetime] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    notes: Optional[str] = None

class PaymentTransactionResponse(PaymentTransactionBase):
    id: int
    transaction_ref: str
    status: str
    bank_transaction_id: Optional[str] = None
    bank_transaction_time: Optional[datetime] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# VietQR Schema
class VietQRRequest(BaseModel):
    booking_id: int
    bank_account_id: Optional[int] = None

class VietQRResponse(BaseModel):
    qr_code_url: str
    qr_data_url: str  # Base64 QR image
    transaction_ref: str
    amount: float
    bank_account: dict
    payment_content: str
    expires_at: datetime

# Casso Webhook Schema
class CassoWebhookData(BaseModel):
    id: int
    tid: str
    description: str
    amount: int
    cusum_balance: int
    when: str  # ISO datetime string
    bank_sub_acc_id: str
    subAccId: str

class CassoWebhookPayload(BaseModel):
    error: int
    messages: list
    data: list[CassoWebhookData]