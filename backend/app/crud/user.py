from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_login(db: Session, login: str):
    normalized = login.strip().lower()
    return db.query(User).filter(
        (func.lower(User.email) == normalized) | (func.lower(User.username) == normalized)
    ).first()

def get_all_users(db: Session):
    return db.query(User).order_by(User.id.desc()).all()

def get_admin_users(db: Session):
    return db.query(User).filter(User.is_admin == True).order_by(User.id.desc()).all()

def get_customer_users(db: Session):
    return db.query(User).filter(User.is_admin == False).order_by(User.id.desc()).all()

def create_user(db: Session, user: UserCreate, is_admin: bool = False, role: str = "editor"):
    hashed_pwd = get_password_hash(user.password)
    db_user = User(
      email=user.email,
      username=getattr(user, "username", None),
      hashed_password=hashed_pwd,
      full_name=user.full_name,
      phone=user.phone,
      google_id=user.google_id,
      avatar_url=user.avatar_url,
      is_active=True,
      is_admin=is_admin,
      role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: User, user_data: dict):
    if "password" in user_data and user_data["password"]:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    elif "password" in user_data:
        user_data.pop("password") # empty string or None

    for key, val in user_data.items():
        setattr(db_user, key, val)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False
