from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.testimonial import get_testimonial, get_all_testimonials, create_testimonial, update_testimonial, delete_testimonial
from app.schemas.testimonial import TestimonialCreate, TestimonialResponse, TestimonialUpdate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/testimonials", tags=["Testimonials"])

@router.get("/", response_model=List[TestimonialResponse])
def read_testimonials(db: Session = Depends(get_db)):
    return get_all_testimonials(db)

@router.post("/", response_model=TestimonialResponse)
def add_testimonial(
    test_in: TestimonialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_testimonial(db, test=test_in)

@router.put("/{testimonial_id}", response_model=TestimonialResponse)
def edit_testimonial(
    testimonial_id: int,
    test_in: TestimonialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_test = get_testimonial(db, testimonial_id)
    if not db_test:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return update_testimonial(db, db_test=db_test, test_data=test_in.model_dump(exclude_unset=True))

@router.delete("/{testimonial_id}")
def remove_testimonial(
    testimonial_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_testimonial(db, testimonial_id)
    if not success:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"detail": "Testimonial deleted successfully"}
