from sqlalchemy.orm import Session
from app.models.country import Country
from app.schemas.country import CountryCreate

def get_country(db: Session, country_id: int):
    return db.query(Country).filter(Country.id == country_id).first()

def get_country_by_slug(db: Session, slug: str):
    return db.query(Country).filter(Country.slug == slug).first()

def get_countries(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Country).order_by(Country.id.asc()).offset(skip).limit(limit).all()

def create_country(db: Session, country: CountryCreate):
    db_country = Country(
        name=country.name,
        slug=country.slug,
        image=country.image,
        continent=country.continent
    )
    db.add(db_country)
    db.commit()
    db.refresh(db_country)
    return db_country

def update_country(db: Session, db_country: Country, country_in: CountryCreate):
    db_country.name = country_in.name
    db_country.slug = country_in.slug
    db_country.image = country_in.image
    db_country.continent = country_in.continent
    db.commit()
    db.refresh(db_country)
    return db_country

def delete_country(db: Session, country_id: int):
    db_country = db.query(Country).filter(Country.id == country_id).first()
    if db_country:
        db.delete(db_country)
        db.commit()
        return True
    return False
