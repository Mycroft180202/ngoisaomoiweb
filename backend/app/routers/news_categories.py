from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.news_category import (
    get_news_category, get_news_category_by_slug, get_all_news_categories, create_news_category, update_news_category, delete_news_category,
    get_news_tag, get_news_tag_by_slug, get_all_news_tags, create_news_tag, update_news_tag, delete_news_tag
)
from app.schemas.news_category import (
    NewsCategoryCreate, NewsCategoryResponse, NewsTagCreate, NewsTagResponse
)
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/news-categories", tags=["News Categories and Tags"])

# Categories
@router.get("/", response_model=List[NewsCategoryResponse])
def read_categories(db: Session = Depends(get_db)):
    return get_all_news_categories(db)

@router.post("/", response_model=NewsCategoryResponse)
def add_category(
    cat_in: NewsCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_news_category_by_slug(db, slug=cat_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists")
    return create_news_category(db, cat=cat_in)

@router.put("/{cat_id}", response_model=NewsCategoryResponse)
def edit_category(
    cat_id: int,
    cat_in: NewsCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_cat = get_news_category(db, cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return update_news_category(db, db_cat=db_cat, cat_data=cat_in.model_dump())

@router.delete("/{cat_id}")
def remove_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_news_category(db, cat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"detail": "Category deleted successfully"}

# Tags (mounted on news-categories/tags for simplicity)
@router.get("/tags/all", response_model=List[NewsTagResponse])
def read_tags(db: Session = Depends(get_db)):
    return get_all_news_tags(db)

@router.post("/tags/all", response_model=NewsTagResponse)
def add_tag(
    tag_in: NewsTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_news_tag_by_slug(db, slug=tag_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Tag slug already exists")
    return create_news_tag(db, tag=tag_in)

@router.put("/tags/{tag_id}", response_model=NewsTagResponse)
def edit_tag(
    tag_id: int,
    tag_in: NewsTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_tag = get_news_tag(db, tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return update_news_tag(db, db_tag=db_tag, tag_data=tag_in.model_dump())

@router.delete("/tags/{tag_id}")
def remove_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_news_tag(db, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"detail": "Tag deleted successfully"}
