from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)

    # Transaction Reference - Unique ID để match với Casso webhook
    transaction_ref = Column(String(50), unique=True, nullable=False, index=True)

    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="VND")

    # Bank information
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True)

    # Casso webhook data
    casso_transaction_id = Column(String(100), nullable=True, unique=True)
    bank_transaction_description = Column(Text, nullable=True)
    bank_transaction_time = Column(DateTime, nullable=True)

    # VietQR information
    vietqr_code = Column(Text, nullable=True)  # Base64 QR code image
    vietqr_url = Column(String(500), nullable=True)  # QR image URL

    # Status tracking
    status = Column(String(20), default="pending")  # pending, completed, failed, expired
    payment_method = Column(String(50), default="bank_transfer")

    # Metadata
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Expiry (QR code expires after 30 minutes)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="payment_transactions")
    bank_account = relationship("BankAccount")