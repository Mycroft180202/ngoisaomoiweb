from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.discount import get_discount, get_discount_by_code, get_discounts, create_discount, update_discount, delete_discount
from app.schemas.discount import DiscountResponse, DiscountCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/discounts", tags=["Discounts Management"])

@router.get("/", response_model=List[DiscountResponse])
def read_discounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_discounts(db, skip=skip, limit=limit)

@router.get("/code/{code}", response_model=DiscountResponse)
def read_discount_by_code(code: str, db: Session = Depends(get_db)):
    db_discount = get_discount_by_code(db, code=code.upper())
    if not db_discount:
        raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại.")
    if not db_discount.is_active:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã bị vô hiệu hóa.")
        
    from datetime import datetime, timezone
    if db_discount.expiry_date:
        now_tz = datetime.now(timezone.utc)
        exp_date = db_discount.expiry_date
        if exp_date.tzinfo is None:
            exp_date = exp_date.replace(tzinfo=timezone.utc)
        if now_tz > exp_date:
            raise HTTPException(status_code=400, detail="Mã giảm giá đã hết hạn.")
            
    return db_discount


@router.get("/{discount_id}", response_model=DiscountResponse)
def read_discount(discount_id: int, db: Session = Depends(get_db)):
    db_discount = get_discount(db, discount_id=discount_id)
    if not db_discount:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return db_discount

@router.post("/", response_model=DiscountResponse)
def add_discount(
    discount_in: DiscountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_discount_by_code(db, code=discount_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    return create_discount(db, discount=discount_in)

@router.put("/{discount_id}", response_model=DiscountResponse)
def edit_discount(
    discount_id: int,
    discount_in: DiscountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_discount = get_discount(db, discount_id=discount_id)
    if not db_discount:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return update_discount(db, db_discount=db_discount, discount_in=discount_in)

@router.delete("/{discount_id}")
def remove_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_discount(db, discount_id=discount_id)
    if not success:
        raise HTTPException(status_code=404, detail="Discount code not found")
    return {"detail": "Discount code deleted successfully"}
