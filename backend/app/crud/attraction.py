from sqlalchemy.orm import Session
from app.models.attraction import Attraction
from app.schemas.attraction import AttractionCreate

def get_attraction(db: Session, attraction_id: int):
    return db.query(Attraction).filter(Attraction.id == attraction_id).first()

def get_attractions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Attraction).order_by(Attraction.id.asc()).offset(skip).limit(limit).all()

def create_attraction(db: Session, attraction: AttractionCreate):
    db_attraction = Attraction(
        name=attraction.name,
        slug=attraction.slug,
        description=attraction.description,
        image=attraction.image,
        province_id=attraction.province_id
    )
    db.add(db_attraction)
    db.commit()
    db.refresh(db_attraction)
    return db_attraction

def update_attraction(db: Session, db_attraction: Attraction, attraction_in: AttractionCreate):
    db_attraction.name = attraction_in.name
    db_attraction.slug = attraction_in.slug
    db_attraction.description = attraction_in.description
    db_attraction.image = attraction_in.image
    db_attraction.province_id = attraction_in.province_id
    db.commit()
    db.refresh(db_attraction)
    return db_attraction

def delete_attraction(db: Session, attraction_id: int):
    db_attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if db_attraction:
        db.delete(db_attraction)
        db.commit()
        return True
    return False
