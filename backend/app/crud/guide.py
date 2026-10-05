from sqlalchemy.orm import Session
from app.models.guide import TourGuide
from app.schemas.guide import GuideCreate

def get_guide(db: Session, guide_id: int):
    return db.query(TourGuide).filter(TourGuide.id == guide_id).first()

def get_guides(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TourGuide).order_by(TourGuide.id.asc()).offset(skip).limit(limit).all()

def create_guide(db: Session, guide: GuideCreate):
    db_guide = TourGuide(
        name=guide.name,
        phone=guide.phone,
        email=guide.email,
        avatar=guide.avatar,
        bio=guide.bio
    )
    db.add(db_guide)
    db.commit()
    db.refresh(db_guide)
    return db_guide

def update_guide(db: Session, db_guide: TourGuide, guide_in: GuideCreate):
    db_guide.name = guide_in.name
    db_guide.phone = guide_in.phone
    db_guide.email = guide_in.email
    db_guide.avatar = guide_in.avatar
    db_guide.bio = guide_in.bio
    db.commit()
    db.refresh(db_guide)
    return db_guide

def delete_guide(db: Session, guide_id: int):
    db_guide = db.query(TourGuide).filter(TourGuide.id == guide_id).first()
    if db_guide:
        db.delete(db_guide)
        db.commit()
        return True
    return False
