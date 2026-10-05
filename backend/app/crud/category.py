from sqlalchemy.orm import Session
from app.models.category import TourCategory
from app.schemas.category import CategoryCreate

def get_category(db: Session, category_id: int):
    return db.query(TourCategory).filter(TourCategory.id == category_id).first()

def get_category_by_slug(db: Session, slug: str):
    return db.query(TourCategory).filter(TourCategory.slug == slug).first()

def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TourCategory).offset(skip).limit(limit).all()

def create_category(db: Session, category: CategoryCreate):
    db_category = TourCategory(
        name=category.name,
        slug=category.slug,
        description=category.description
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, db_category: TourCategory, category_in: CategoryCreate):
    db_category.name = category_in.name
    db_category.slug = category_in.slug
    db_category.description = category_in.description
    db.commit()
    db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    db_category = db.query(TourCategory).filter(TourCategory.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False
