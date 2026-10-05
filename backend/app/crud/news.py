from sqlalchemy.orm import Session
from app.models.news import News
from app.models.news_category import NewsCategory, NewsTag
from app.schemas.news import NewsCreate, NewsUpdate
from typing import Optional

def get_news(db: Session, news_id: int):
    return db.query(News).filter(News.id == news_id).first()

def get_news_by_slug(db: Session, slug: str):
    return db.query(News).filter(News.slug == slug).first()

def get_all_news(db: Session, skip: int = 0, limit: int = 100, category: Optional[str] = None):
    query = db.query(News)
    if category:
        query = query.filter(News.category == category)
    return query.order_by(News.created_at.desc()).offset(skip).limit(limit).all()

def create_news(db: Session, news: NewsCreate):
    # Set legacy category string from category_id if name not explicitly provided
    legacy_category = news.category
    if news.category_id:
        db_cat = db.query(NewsCategory).filter(NewsCategory.id == news.category_id).first()
        if db_cat:
            legacy_category = db_cat.name

    db_news = News(
        slug=news.slug,
        title=news.title,
        summary=news.summary,
        content=news.content,
        image=news.image,
        video_url=news.video_url,
        category=legacy_category,
        category_id=news.category_id,
        author=news.author
    )

    if news.tag_ids:
        tags = db.query(NewsTag).filter(NewsTag.id.in_(news.tag_ids)).all()
        db_news.tags = tags

    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news

def update_news(db: Session, db_news: News, news: NewsUpdate):
    update_data = news.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for key, value in update_data.items():
        setattr(db_news, key, value)

    # Sync legacy category name
    if "category_id" in update_data and update_data["category_id"]:
        db_cat = db.query(NewsCategory).filter(NewsCategory.id == update_data["category_id"]).first()
        if db_cat:
            db_news.category = db_cat.name

    if tag_ids is not None:
        tags = db.query(NewsTag).filter(NewsTag.id.in_(tag_ids)).all()
        db_news.tags = tags

    db.commit()
    db.refresh(db_news)
    return db_news

def delete_news(db: Session, news_id: int):
    db_news = db.query(News).filter(News.id == news_id).first()
    if db_news:
        db.delete(db_news)
        db.commit()
        return True
    return False
