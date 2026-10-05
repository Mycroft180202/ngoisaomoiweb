from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.guide import get_guide, get_guides, create_guide, update_guide, delete_guide
from app.schemas.guide import GuideResponse, GuideCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/guides", tags=["Guides Management"])

@router.get("/", response_model=List[GuideResponse])
def read_guides(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_guides(db, skip=skip, limit=limit)

@router.get("/{guide_id}", response_model=GuideResponse)
def read_guide(guide_id: int, db: Session = Depends(get_db)):
    db_guide = get_guide(db, guide_id=guide_id)
    if not db_guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return db_guide

@router.post("/", response_model=GuideResponse)
def add_guide(
    guide_in: GuideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_guide(db, guide=guide_in)

@router.put("/{guide_id}", response_model=GuideResponse)
def edit_guide(
    guide_id: int,
    guide_in: GuideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_guide = get_guide(db, guide_id=guide_id)
    if not db_guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return update_guide(db, db_guide=db_guide, guide_in=guide_in)

@router.delete("/{guide_id}")
def remove_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_guide(db, guide_id=guide_id)
    if not success:
        raise HTTPException(status_code=404, detail="Guide not found")
    return {"detail": "Guide deleted successfully"}
