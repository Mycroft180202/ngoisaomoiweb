from sqlalchemy.orm import Session
from app.models.bank import BankAccount
from app.schemas.bank import BankAccountCreate

def get_bank(db: Session, bank_id: int):
    return db.query(BankAccount).filter(BankAccount.id == bank_id).first()

def get_all_banks(db: Session):
    return db.query(BankAccount).order_by(BankAccount.bank_name).all()

def create_bank(db: Session, bank: BankAccountCreate):
    db_bank = BankAccount(
        bank_name=bank.bank_name,
        account_name=bank.account_name,
        account_number=bank.account_number,
        branch=bank.branch,
        qr_code_url=bank.qr_code_url,
        is_active=bank.is_active
    )
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

def update_bank(db: Session, db_bank: BankAccount, bank_data: dict):
    for key, val in bank_data.items():
        setattr(db_bank, key, val)
    db.commit()
    db.refresh(db_bank)
    return db_bank

def delete_bank(db: Session, bank_id: int):
    db_bank = get_bank(db, bank_id)
    if db_bank:
        db.delete(db_bank)
        db.commit()
        return True
    return False
