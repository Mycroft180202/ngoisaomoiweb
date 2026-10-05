from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.slide import get_slide, get_all_slides, create_slide, update_slide, delete_slide
from app.schemas.slide import CarouselSlideCreate, CarouselSlideResponse, CarouselSlideUpdate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/slides", tags=["Carousel Slides"])

@router.get("/", response_model=List[CarouselSlideResponse])
def read_slides(db: Session = Depends(get_db)):
    return get_all_slides(db)

@router.post("/", response_model=CarouselSlideResponse)
def add_slide(
    slide_in: CarouselSlideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_slide(db, slide=slide_in)

@router.put("/{slide_id}", response_model=CarouselSlideResponse)
def edit_slide(
    slide_id: int,
    slide_in: CarouselSlideUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_slide = get_slide(db, slide_id)
    if not db_slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    return update_slide(db, db_slide=db_slide, slide_data=slide_in.model_dump(exclude_unset=True))

@router.delete("/{slide_id}")
def remove_slide(
    slide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_slide(db, slide_id)
    if not success:
        raise HTTPException(status_code=404, detail="Slide not found")
    return {"detail": "Slide deleted successfully"}
