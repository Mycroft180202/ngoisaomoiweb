from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.user import get_user, get_all_users, get_admin_users, get_customer_users, create_user, update_user, delete_user
from app.schemas.user import UserCreate, UserResponse, AdminUserUpdate, AdminUserCreate, SaleUserAutoCreate
from app.routers.auth import get_current_user, require_super_admin
from app.models.user import User
from app.core.security import get_password_hash
import re
import unicodedata

router = APIRouter(prefix="/users", tags=["Users management"])

def _sale_username(full_name: str) -> str:
    plain = unicodedata.normalize("NFD", full_name.strip())
    plain = "".join(ch for ch in plain if unicodedata.category(ch) != "Mn").replace("Đ", "D").replace("đ", "d")
    parts = re.findall(r"[A-Za-z0-9]+", plain)
    if not parts:
        raise HTTPException(status_code=422, detail="Họ tên không hợp lệ")
    # Tên + chữ đầu của họ và toàn bộ tên đệm: Đào Thị Vân Anh -> Anhdtv
    return (parts[-1] + "".join(part[0] for part in parts[:-1])).capitalize()

@router.post("/sales/auto", response_model=UserResponse)
def auto_create_sale(
    payload: SaleUserAutoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    base = _sale_username(payload.full_name)
    username = base
    suffix = 2
    while db.query(User).filter(User.username.ilike(username)).first():
        username = f"{base}{suffix}"
        suffix += 1
    # Use a syntactically valid internal subdomain so EmailStr serialization succeeds.
    # This is only a login identifier when the employee does not provide personal email.
    email = str(payload.email).lower() if payload.email else f"{username.lower()}@accounts.newstartour.vn"
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    user = User(username=username, email=email, full_name=payload.full_name.strip(), phone=payload.phone,
                hashed_password=get_password_hash("12345678"), is_active=True, is_admin=True,
                role="sale", must_change_password=True)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.get("/", response_model=List[UserResponse])
def read_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return get_all_users(db)

@router.get("/admins", response_model=List[UserResponse])
def read_admin_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return get_admin_users(db)

@router.get("/customers", response_model=List[UserResponse])
def read_customer_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return get_customer_users(db)

@router.post("/", response_model=UserResponse)
def add_user(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    from app.crud.user import get_user_by_email
    existing = get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user=user_in, is_admin=user_in.is_admin, role=user_in.role)

@router.put("/{user_id}", response_model=UserResponse)
def edit_user(
    user_id: int,
    user_in: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    db_user = get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return update_user(db, db_user=db_user, user_data=user_in.model_dump(exclude_unset=True))

@router.delete("/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User deleted successfully"}
