from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String, unique=True, index=True, nullable=True)
    tour_id = Column(Integer, ForeignKey("tours.id", ondelete="SET NULL"), nullable=True)
    tour_title = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    departure_date = Column(Date, nullable=False)
    guests_count = Column(Integer, nullable=False, default=1)
    adults_count = Column(Integer, nullable=False, default=1)
    children_count = Column(Integer, nullable=False, default=0)
    infants_count = Column(Integer, nullable=False, default=0)
    notes = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, confirmed, cancelled
    payment_status = Column(String, default="unpaid")  # unpaid, pending, paid
    payment_proof = Column(String, nullable=True)
    payment_ref = Column(String, nullable=True)
    total_amount = Column(Float, default=0.0)
    discount_code = Column(String, nullable=True)
    discount_amount = Column(Float, default=0.0)
    partner_code = Column(String, nullable=True)
    partner_commission = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    crm_sync_status = Column(String, nullable=False, default="not_synced")
    crm_customer_id = Column(String, nullable=True)
    crm_booking_id = Column(String, nullable=True)
    crm_last_error = Column(String, nullable=True)
    crm_synced_at = Column(DateTime(timezone=True), nullable=True)

    tour = relationship("Tour", back_populates="bookings")
    payment_transactions = relationship("PaymentTransaction", back_populates="booking", cascade="all, delete-orphan")

    @property
    def secure_token(self) -> str:
        import hmac
        import hashlib
        from app.core.config import settings
        message = str(self.id).encode("utf-8")
        key = settings.JWT_SECRET_KEY.encode("utf-8")
        return hmac.new(key, message, hashlib.sha256).hexdigest()


