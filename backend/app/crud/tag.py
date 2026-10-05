from sqlalchemy.orm import Session
from app.models.tag import TourTag
from app.schemas.tag import TagCreate

def get_tag(db: Session, tag_id: int):
    return db.query(TourTag).filter(TourTag.id == tag_id).first()

def get_tags(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TourTag).offset(skip).limit(limit).all()

def create_tag(db: Session, tag: TagCreate):
    db_tag = TourTag(
        name=tag.name,
        slug=tag.slug
    )
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def update_tag(db: Session, db_tag: TourTag, tag_in: TagCreate):
    db_tag.name = tag_in.name
    db_tag.slug = tag_in.slug
    db.commit()
    db.refresh(db_tag)
    return db_tag

def delete_tag(db: Session, tag_id: int):
    db_tag = db.query(TourTag).filter(TourTag.id == tag_id).first()
    if db_tag:
        db.delete(db_tag)
        db.commit()
        return True
    return False
