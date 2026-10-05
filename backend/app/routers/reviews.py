from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.review import get_review, get_reviews, create_review, update_review, delete_review
from app.schemas.review import ReviewResponse, ReviewCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/reviews", tags=["Reviews Management"])

@router.get("/", response_model=List[ReviewResponse])
def read_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_reviews(db, skip=skip, limit=limit)

@router.get("/{review_id}", response_model=ReviewResponse)
def read_review(review_id: int, db: Session = Depends(get_db)):
    db_review = get_review(db, review_id=review_id)
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    return db_review

@router.post("/", response_model=ReviewResponse)
def add_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db)
):
    # Public route to leave reviews
    return create_review(db, review=review_in)

@router.put("/{review_id}", response_model=ReviewResponse)
def edit_review(
    review_id: int,
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_review = get_review(db, review_id=review_id)
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    return update_review(db, db_review=db_review, review_in=review_in)

@router.delete("/{review_id}")
def remove_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_review(db, review_id=review_id)
    if not success:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"detail": "Review deleted successfully"}
