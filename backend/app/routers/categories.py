from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.category import get_category, get_category_by_slug, get_categories, create_category, update_category, delete_category
from app.schemas.category import CategoryResponse, CategoryCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/categories", tags=["Categories Management"])

@router.get("/", response_model=List[CategoryResponse])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_categories(db, skip=skip, limit=limit)

@router.get("/{category_id}", response_model=CategoryResponse)
def read_category(category_id: int, db: Session = Depends(get_db)):
    db_category = get_category(db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.post("/", response_model=CategoryResponse)
def add_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_category_by_slug(db, slug=category_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists")
    return create_category(db, category=category_in)

@router.put("/{category_id}", response_model=CategoryResponse)
def edit_category(
    category_id: int,
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_category = get_category(db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return update_category(db, db_category=db_category, category_in=category_in)

@router.delete("/{category_id}")
def remove_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_category(db, category_id=category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"detail": "Category deleted successfully"}
