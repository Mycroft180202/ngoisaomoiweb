from sqlalchemy.orm import Session
from datetime import date
from app.models.tour import TourSchedule
from app.schemas.tour_schedule import TourScheduleCreate, TourScheduleUpdate

def get_tour_schedule(db: Session, schedule_id: int):
    return db.query(TourSchedule).filter(TourSchedule.id == schedule_id).first()

def get_tour_schedule_by_date(db: Session, tour_id: int, departure_date: date):
    return db.query(TourSchedule).filter(
        TourSchedule.tour_id == tour_id,
        TourSchedule.departure_date == departure_date
    ).first()

def get_tour_schedules(db: Session, skip: int = 0, limit: int = 100, tour_id: int = None):
    query = db.query(TourSchedule)
    if tour_id is not None:
        query = query.filter(TourSchedule.tour_id == tour_id)
    return query.order_by(TourSchedule.departure_date.asc()).offset(skip).limit(limit).all()

def create_tour_schedule(db: Session, schedule: TourScheduleCreate):
    db_schedule = TourSchedule(
        tour_id=schedule.tour_id,
        departure_date=schedule.departure_date,
        max_capacity=schedule.max_capacity,
        booked_seats=schedule.booked_seats,
        actual_cost=schedule.actual_cost,
        status=schedule.status
    )
    db.add(db_schedule)
    db.flush()
    db_schedule.departure_code = f"DEP-{schedule.departure_date:%Y%m%d}-{db_schedule.id:06d}"
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def update_tour_schedule(db: Session, db_schedule: TourSchedule, schedule_in: TourScheduleUpdate):
    update_data = schedule_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def delete_tour_schedule(db: Session, schedule_id: int) -> bool:
    db_schedule = get_tour_schedule(db, schedule_id)
    if not db_schedule:
        return False
    db.delete(db_schedule)
    db.commit()
    return True
