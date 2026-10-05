from sqlalchemy.orm import Session
from app.models.ad_banner import AdBanner
from app.schemas.ad_banner import AdBannerCreate

def get_banner(db: Session, banner_id: int):
    return db.query(AdBanner).filter(AdBanner.id == banner_id).first()

def get_all_banners(db: Session):
    return db.query(AdBanner).order_by(AdBanner.order_index).all()

def create_banner(db: Session, banner: AdBannerCreate):
    db_banner = AdBanner(
        title=banner.title,
        image_url=banner.image_url,
        media_type=banner.media_type,
        media_url=banner.media_url,
        poster_url=banner.poster_url,
        link_url=banner.link_url,
        position=banner.position,
        order_index=banner.order_index,
        is_active=banner.is_active,
        autoplay=banner.autoplay,
        muted=banner.muted,
        loop=banner.loop,
        show_close_button=banner.show_close_button,
        open_in_new_tab=banner.open_in_new_tab,
        start_at=banner.start_at,
        end_at=banner.end_at,
    )
    db.add(db_banner)
    db.commit()
    db.refresh(db_banner)
    return db_banner

def update_banner(db: Session, db_banner: AdBanner, banner_data: dict):
    for key, val in banner_data.items():
        setattr(db_banner, key, val)
    db.commit()
    db.refresh(db_banner)
    return db_banner

def delete_banner(db: Session, banner_id: int):
    db_banner = get_banner(db, banner_id)
    if db_banner:
        db.delete(db_banner)
        db.commit()
        return True
    return False
