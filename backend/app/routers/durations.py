from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.duration import get_duration, get_durations, create_duration, update_duration, delete_duration
from app.schemas.duration import DurationResponse, DurationCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/durations", tags=["Durations Management"])

@router.get("/", response_model=List[DurationResponse])
def read_durations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_durations(db, skip=skip, limit=limit)

@router.get("/{duration_id}", response_model=DurationResponse)
def read_duration(duration_id: int, db: Session = Depends(get_db)):
    db_duration = get_duration(db, duration_id=duration_id)
    if not db_duration:
        raise HTTPException(status_code=404, detail="Duration not found")
    return db_duration

@router.post("/", response_model=DurationResponse)
def add_duration(
    duration_in: DurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_duration(db, duration=duration_in)

@router.put("/{duration_id}", response_model=DurationResponse)
def edit_duration(
    duration_id: int,
    duration_in: DurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_duration = get_duration(db, duration_id=duration_id)
    if not db_duration:
        raise HTTPException(status_code=404, detail="Duration not found")
    return update_duration(db, db_duration=db_duration, duration_in=duration_in)

@router.delete("/{duration_id}")
def remove_duration(
    duration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_duration(db, duration_id=duration_id)
    if not success:
        raise HTTPException(status_code=404, detail="Duration not found")
    return {"detail": "Duration deleted successfully"}
