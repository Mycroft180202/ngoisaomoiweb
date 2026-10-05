from sqlalchemy.orm import Session
from app.models.discount import DiscountCode
from app.schemas.discount import DiscountCreate, DiscountUpdate

def get_discount(db: Session, discount_id: int):
    return db.query(DiscountCode).filter(DiscountCode.id == discount_id).first()

def get_discount_by_code(db: Session, code: str):
    return db.query(DiscountCode).filter(DiscountCode.code == code).first()

def get_discounts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(DiscountCode).order_by(DiscountCode.id.desc()).offset(skip).limit(limit).all()

def create_discount(db: Session, discount: DiscountCreate):
    db_discount = DiscountCode(
        code=discount.code.upper(),
        discount_type=discount.discount_type,
        value=discount.value,
        min_value=discount.min_value,
        max_uses=discount.max_uses or 0,
        used_count=0,
        expiry_date=discount.expiry_date,
        is_active=discount.is_active
    )
    db.add(db_discount)
    db.commit()
    db.refresh(db_discount)
    return db_discount

def update_discount(db: Session, db_discount: DiscountCode, discount_in: DiscountUpdate):
    update_data = discount_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "code" and value:
            value = value.upper()
        setattr(db_discount, key, value)
    db.commit()
    db.refresh(db_discount)
    return db_discount

def delete_discount(db: Session, discount_id: int):
    db_discount = db.query(DiscountCode).filter(DiscountCode.id == discount_id).first()
    if db_discount:
        db.delete(db_discount)
        db.commit()
        return True
    return False
