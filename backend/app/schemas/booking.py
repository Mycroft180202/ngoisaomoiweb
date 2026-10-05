from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Literal, Optional
from datetime import date, datetime

class BookingBase(BaseModel):
    tour_id: Optional[int] = None
    tour_title: str
    full_name: str
    email: EmailStr
    phone: str
    departure_date: date
    guests_count: int = Field(default=1, ge=1, le=200)
    adults_count: int = Field(default=1, ge=1, le=200)
    children_count: int = Field(default=0, ge=0, le=200)
    infants_count: int = Field(default=0, ge=0, le=200)
    notes: Optional[str] = None
    payment_status: Literal["unpaid", "pending", "paid"] = "unpaid"
    payment_proof: Optional[Optional[str]] = None
    payment_ref: Optional[Optional[str]] = None
    total_amount: Optional[float] = 0.0
    discount_code: Optional[str] = None
    discount_amount: Optional[float] = 0.0

class BookingCreate(BookingBase):
    # Giá và trạng thái thanh toán luôn do server/admin quyết định.
    payment_status: Literal["unpaid"] = "unpaid"

class BookingUpdate(BaseModel):
    status: Optional[Literal["pending", "confirmed", "cancelled"]] = None
    guests_count: Optional[int] = Field(default=None, ge=1, le=200)
    adults_count: Optional[int] = Field(default=None, ge=1, le=200)
    children_count: Optional[int] = Field(default=None, ge=0, le=200)
    infants_count: Optional[int] = Field(default=None, ge=0, le=200)
    departure_date: Optional[date] = None
    notes: Optional[str] = None
    payment_status: Optional[Literal["unpaid", "pending", "paid"]] = None
    payment_proof: Optional[str] = None
    payment_ref: Optional[str] = None
    total_amount: Optional[float] = None
    discount_code: Optional[str] = None
    discount_amount: Optional[float] = None

class BookingResponse(BookingBase):
    id: int
    booking_code: Optional[str] = None
    status: str
    crm_sync_status: str = "not_synced"
    crm_customer_id: Optional[str] = None
    crm_booking_id: Optional[str] = None
    crm_last_error: Optional[str] = None
    crm_synced_at: Optional[datetime] = None
    created_at: datetime
    secure_token: Optional[str] = None

    class Config:
        from_attributes = True

# Schema for submitting payment proof
class PaymentProofSubmit(BaseModel):
    payment_proof: str
    payment_ref: Optional[str] = None

class BookingLookup(BaseModel):
    booking_id: Optional[int] = Field(default=None, ge=1)
    booking_code: Optional[str] = Field(default=None, min_length=1, max_length=80)
    email_or_phone: str = Field(min_length=1, max_length=254)

    @model_validator(mode="after")
    def require_identifier(self):
        if (self.booking_id is None) == (self.booking_code is None):
            raise ValueError("Cần cung cấp mã đơn hàng hoặc ID đơn hàng.")
        return self


class CrmBookingStatusUpdate(BaseModel):
    booking_id: int = Field(ge=1)
    booking_code: str = Field(min_length=1, max_length=80)
    crm_booking_id: str = Field(min_length=1, max_length=80)
    status: Literal["pending", "confirmed", "cancelled"]
    payment_status: Literal["unpaid", "pending", "paid"]
    expected_status: Literal["pending", "confirmed", "cancelled"]
    expected_payment_status: Literal["unpaid", "pending", "paid"]

