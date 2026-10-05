from sqlalchemy.orm import Session
from app.models.duration import TourDuration
from app.schemas.duration import DurationCreate

def get_duration(db: Session, duration_id: int):
    return db.query(TourDuration).filter(TourDuration.id == duration_id).first()

def get_durations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TourDuration).offset(skip).limit(limit).all()

def create_duration(db: Session, duration: DurationCreate):
    db_duration = TourDuration(
        name=duration.name,
        days=duration.days,
        nights=duration.nights
    )
    db.add(db_duration)
    db.commit()
    db.refresh(db_duration)
    return db_duration

def update_duration(db: Session, db_duration: TourDuration, duration_in: DurationCreate):
    db_duration.name = duration_in.name
    db_duration.days = duration_in.days
    db_duration.nights = duration_in.nights
    db.commit()
    db.refresh(db_duration)
    return db_duration

def delete_duration(db: Session, duration_id: int):
    db_duration = db.query(TourDuration).filter(TourDuration.id == duration_id).first()
    if db_duration:
        db.delete(db_duration)
        db.commit()
        return True
    return False
