from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import secrets
import string

from app.models.payment_transaction import PaymentTransaction
from app.schemas.payment_transaction import PaymentTransactionCreate, PaymentTransactionUpdate

def generate_transaction_ref() -> str:
    """Generate unique transaction reference code"""
    # Format: NST + 8 random chars (NST = New Star Tour)
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(8))
    return f"NST{random_part}"

def create_payment_transaction(db: Session, payment: PaymentTransactionCreate, transaction_ref: Optional[str] = None) -> PaymentTransaction:
    """Create new payment transaction"""
    if not transaction_ref:
        # Generate unique transaction reference
        while True:
            transaction_ref = generate_transaction_ref()
            existing = db.query(PaymentTransaction).filter(
                PaymentTransaction.transaction_ref == transaction_ref
            ).first()
            if not existing:
                break

    db_payment = PaymentTransaction(
        **payment.dict(),
        transaction_ref=transaction_ref,
        status="pending"
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payment_transaction(db: Session, payment_id: int) -> Optional[PaymentTransaction]:
    """Get payment transaction by ID"""
    return db.query(PaymentTransaction).filter(PaymentTransaction.id == payment_id).first()

def get_payment_transaction_by_ref(db: Session, transaction_ref: str) -> Optional[PaymentTransaction]:
    """Get payment transaction by reference code"""
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.transaction_ref == transaction_ref
    ).first()

def get_payment_by_booking_id(db: Session, booking_id: int) -> Optional[PaymentTransaction]:
    """Get payment transaction by booking ID"""
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.booking_id == booking_id
    ).first()

def get_payment_transactions(db: Session, skip: int = 0, limit: int = 100) -> List[PaymentTransaction]:
    """Get all payment transactions with pagination"""
    return db.query(PaymentTransaction).order_by(
        desc(PaymentTransaction.created_at)
    ).offset(skip).limit(limit).all()

def update_payment_transaction(
    db: Session,
    db_payment: PaymentTransaction,
    payment_update: PaymentTransactionUpdate
) -> PaymentTransaction:
    """Update payment transaction"""
    update_data = payment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_payment, field, value)

    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_all_payment_transactions(db: Session, skip: int = 0, limit: int = 100) -> List[PaymentTransaction]:
    """Get all payment transactions for admin"""
    return db.query(PaymentTransaction).order_by(
        desc(PaymentTransaction.created_at)
    ).offset(skip).limit(limit).all()

def get_payment_transactions_by_status(db: Session, status: str) -> List[PaymentTransaction]:
    """Get payment transactions by status"""
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.status == status
    ).order_by(desc(PaymentTransaction.created_at)).all()

def manually_confirm_payment(db: Session, transaction_id: int) -> Optional[PaymentTransaction]:
    """Manually confirm a payment transaction (admin action)"""
    db_payment = get_payment_transaction(db, transaction_id)
    if not db_payment:
        return None

    if db_payment.status == "pending":
        db_payment.status = "completed"
        db_payment.completed_at = datetime.utcnow()

        # Update booking status
        if db_payment.booking:
            db_payment.booking.payment_status = "paid"
            db_payment.booking.status = "confirmed"

        db.commit()
        db.refresh(db_payment)

    return db_payment

def mark_payment_completed(
    db: Session,
    transaction_ref: str,
    bank_transaction_id: str,
    bank_transaction_time: str = None,
    bank_account_number: str = None,
    bank_account_name: str = None
) -> Optional[PaymentTransaction]:
    """Mark payment as completed (called from Casso webhook)"""
    db_payment = get_payment_transaction_by_ref(db, transaction_ref)
    if not db_payment:
        return None

    db_payment.status = "completed"
    db_payment.bank_transaction_id = bank_transaction_id
    if bank_transaction_time:
        from datetime import datetime
        db_payment.bank_transaction_time = datetime.fromisoformat(bank_transaction_time)
    if bank_account_number:
        db_payment.bank_account_number = bank_account_number
    if bank_account_name:
        db_payment.bank_account_name = bank_account_name

    # Update related booking status
    if db_payment.booking:
        db_payment.booking.payment_status = "paid"
        db_payment.booking.status = "confirmed"

    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_pending_payments(db: Session) -> List[PaymentTransaction]:
    """Get all pending payments for status checking"""
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.status == "pending"
    ).all()