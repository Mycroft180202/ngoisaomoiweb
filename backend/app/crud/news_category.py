from sqlalchemy.orm import Session
from app.models.news_category import NewsCategory, NewsTag
from app.schemas.news_category import NewsCategoryCreate, NewsTagCreate
from typing import Optional

# Category CRUD
def get_news_category(db: Session, cat_id: int):
    return db.query(NewsCategory).filter(NewsCategory.id == cat_id).first()

def get_news_category_by_slug(db: Session, slug: str):
    return db.query(NewsCategory).filter(NewsCategory.slug == slug).first()

def get_all_news_categories(db: Session):
    return db.query(NewsCategory).order_by(NewsCategory.name).all()

def create_news_category(db: Session, cat: NewsCategoryCreate):
    db_cat = NewsCategory(name=cat.name, slug=cat.slug, description=cat.description)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

def update_news_category(db: Session, db_cat: NewsCategory, cat_data: dict):
    for key, val in cat_data.items():
        setattr(db_cat, key, val)
    db.commit()
    db.refresh(db_cat)
    return db_cat

def delete_news_category(db: Session, cat_id: int):
    db_cat = get_news_category(db, cat_id)
    if db_cat:
        db.delete(db_cat)
        db.commit()
        return True
    return False

# Tag CRUD
def get_news_tag(db: Session, tag_id: int):
    return db.query(NewsTag).filter(NewsTag.id == tag_id).first()

def get_news_tag_by_slug(db: Session, slug: str):
    return db.query(NewsTag).filter(NewsTag.slug == slug).first()

def get_all_news_tags(db: Session):
    return db.query(NewsTag).order_by(NewsTag.name).all()

def create_news_tag(db: Session, tag: NewsTagCreate):
    db_tag = NewsTag(name=tag.name, slug=tag.slug)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def update_news_tag(db: Session, db_tag: NewsTag, tag_data: dict):
    for key, val in tag_data.items():
        setattr(db_tag, key, val)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def delete_news_tag(db: Session, tag_id: int):
    db_tag = get_news_tag(db, tag_id)
    if db_tag:
        db.delete(db_tag)
        db.commit()
        return True
    return False
