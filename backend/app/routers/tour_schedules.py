from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.crud.tour_schedule import (
    get_tour_schedule,
    get_tour_schedules,
    create_tour_schedule,
    update_tour_schedule,
    delete_tour_schedule,
    get_tour_schedule_by_date
)
from app.schemas.tour_schedule import TourScheduleCreate, TourScheduleResponse, TourScheduleUpdate
from app.routers.auth import get_current_user
from app.models.user import User
from app.crud.tour import get_tour

router = APIRouter(prefix="/tour-schedules", tags=["Tour Schedules"])

@router.get("/", response_model=List[TourScheduleResponse])
def read_tour_schedules(
    skip: int = 0,
    limit: int = 100,
    tour_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    return get_tour_schedules(db, skip=skip, limit=limit, tour_id=tour_id)

@router.get("/{schedule_id}", response_model=TourScheduleResponse)
def read_tour_schedule(schedule_id: int, db: Session = Depends(get_db)):
    db_schedule = get_tour_schedule(db, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Tour schedule not found")
    return db_schedule

@router.post("/", response_model=TourScheduleResponse)
def add_tour_schedule(
    schedule_in: TourScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if tour exists
    tour = get_tour(db, tour_id=schedule_in.tour_id)
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    # Check if date already exists for this tour
    existing = get_tour_schedule_by_date(db, tour_id=schedule_in.tour_id, departure_date=schedule_in.departure_date)
    if existing:
        raise HTTPException(status_code=400, detail="Lịch khởi hành cho ngày này đã tồn tại.")

    return create_tour_schedule(db, schedule=schedule_in)

@router.put("/{schedule_id}", response_model=TourScheduleResponse)
def edit_tour_schedule(
    schedule_id: int,
    schedule_in: TourScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    db_schedule = get_tour_schedule(db, schedule_id)
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Tour schedule not found")

    return update_tour_schedule(db, db_schedule=db_schedule, schedule_in=schedule_in)

@router.delete("/{schedule_id}")
def remove_tour_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    success = delete_tour_schedule(db, schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tour schedule not found")

    return {"detail": "Tour schedule deleted successfully"}
