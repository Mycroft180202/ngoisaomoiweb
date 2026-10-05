from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.bank import get_bank, get_all_banks, create_bank, update_bank, delete_bank
from app.schemas.bank import BankAccountCreate, BankAccountResponse, BankAccountUpdate
from app.routers.auth import get_current_user, require_super_admin
from app.models.user import User

router = APIRouter(prefix="/banks", tags=["Bank Accounts"])

@router.get("/", response_model=List[BankAccountResponse])
def read_banks(db: Session = Depends(get_db)):
    return get_all_banks(db)

@router.get("/active", response_model=List[BankAccountResponse])
def read_active_banks(db: Session = Depends(get_db)):
    """Get active bank accounts for payment display"""
    from app.models.bank import BankAccount
    return db.query(BankAccount).filter(BankAccount.is_active == True).all()

@router.post("/", response_model=BankAccountResponse)
def add_bank(
    bank_in: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return create_bank(db, bank=bank_in)

@router.put("/{bank_id}", response_model=BankAccountResponse)
def edit_bank(
    bank_id: int,
    bank_in: BankAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    db_bank = get_bank(db, bank_id)
    if not db_bank:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return update_bank(db, db_bank=db_bank, bank_data=bank_in.model_dump(exclude_unset=True))

@router.delete("/{bank_id}")
def remove_bank(
    bank_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    success = delete_bank(db, bank_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return {"detail": "Bank account deleted successfully"}

