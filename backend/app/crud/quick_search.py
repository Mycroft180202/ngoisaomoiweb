from sqlalchemy.orm import Session
from app.models.quick_search import QuickSearch
from app.schemas.quick_search import QuickSearchCreate

def get_quick_search(db: Session, quick_search_id: int):
    return db.query(QuickSearch).filter(QuickSearch.id == quick_search_id).first()

def get_quick_searches(db: Session, skip: int = 0, limit: int = 100):
    return db.query(QuickSearch).order_by(QuickSearch.order_index).offset(skip).limit(limit).all()

def create_quick_search(db: Session, quick_search: QuickSearchCreate):
    db_quick = QuickSearch(
        keyword=quick_search.keyword,
        link_url=quick_search.link_url,
        order_index=quick_search.order_index,
        is_active=quick_search.is_active
    )
    db.add(db_quick)
    db.commit()
    db.refresh(db_quick)
    return db_quick

def update_quick_search(db: Session, db_quick: QuickSearch, quick_search_in: QuickSearchCreate):
    db_quick.keyword = quick_search_in.keyword
    db_quick.link_url = quick_search_in.link_url
    db_quick.order_index = quick_search_in.order_index
    db_quick.is_active = quick_search_in.is_active
    db.commit()
    db.refresh(db_quick)
    return db_quick

def delete_quick_search(db: Session, quick_search_id: int):
    db_quick = db.query(QuickSearch).filter(QuickSearch.id == quick_search_id).first()
    if db_quick:
        db.delete(db_quick)
        db.commit()
        return True
    return False
