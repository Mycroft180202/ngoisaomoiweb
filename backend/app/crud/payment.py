from sqlalchemy.orm import Session
from app.models.payment import PaymentMethod
from app.schemas.payment import PaymentMethodCreate

def get_payment(db: Session, payment_id: int):
    return db.query(PaymentMethod).filter(PaymentMethod.id == payment_id).first()

def get_all_payments(db: Session):
    return db.query(PaymentMethod).order_by(PaymentMethod.name).all()

def create_payment(db: Session, payment: PaymentMethodCreate):
    db_payment = PaymentMethod(
        name=payment.name,
        description=payment.description,
        icon_url=payment.icon_url,
        is_active=payment.is_active
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def update_payment(db: Session, db_payment: PaymentMethod, payment_data: dict):
    for key, val in payment_data.items():
        setattr(db_payment, key, val)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def delete_payment(db: Session, payment_id: int):
    db_payment = get_payment(db, payment_id)
    if db_payment:
        db.delete(db_payment)
        db.commit()
        return True
    return False
