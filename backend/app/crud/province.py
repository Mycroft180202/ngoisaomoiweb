from sqlalchemy.orm import Session
from app.models.province import ProvinceCity
from app.schemas.province import ProvinceCreate

def get_province(db: Session, province_id: int):
    return db.query(ProvinceCity).filter(ProvinceCity.id == province_id).first()

def get_provinces(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ProvinceCity).order_by(ProvinceCity.id.asc()).offset(skip).limit(limit).all()

def create_province(db: Session, province: ProvinceCreate):
    db_province = ProvinceCity(
        name=province.name,
        slug=province.slug,
        image=province.image,
        region=province.region,
        country_id=province.country_id
    )
    db.add(db_province)
    db.commit()
    db.refresh(db_province)
    return db_province

def update_province(db: Session, db_province: ProvinceCity, province_in: ProvinceCreate):
    db_province.name = province_in.name
    db_province.slug = province_in.slug
    db_province.image = province_in.image
    db_province.region = province_in.region
    db_province.country_id = province_in.country_id
    db.commit()
    db.refresh(db_province)
    return db_province

def delete_province(db: Session, province_id: int):
    db_province = db.query(ProvinceCity).filter(ProvinceCity.id == province_id).first()
    if db_province:
        db.delete(db_province)
        db.commit()
        return True
    return False
