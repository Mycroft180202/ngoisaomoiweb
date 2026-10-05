from sqlalchemy.orm import Session
from app.models.slide import CarouselSlide
from app.schemas.slide import CarouselSlideCreate

def get_slide(db: Session, slide_id: int):
    return db.query(CarouselSlide).filter(CarouselSlide.id == slide_id).first()

def get_all_slides(db: Session):
    return db.query(CarouselSlide).order_by(CarouselSlide.order_index).all()

def create_slide(db: Session, slide: CarouselSlideCreate):
    db_slide = CarouselSlide(
        title=slide.title,
        subtitle=slide.subtitle,
        image_url=slide.image_url,
        tour_image_url=slide.tour_image_url,
        link_url=slide.link_url,
        order_index=slide.order_index,
        is_active=slide.is_active
    )
    db.add(db_slide)
    db.commit()
    db.refresh(db_slide)
    return db_slide

def update_slide(db: Session, db_slide: CarouselSlide, slide_data: dict):
    for key, val in slide_data.items():
        setattr(db_slide, key, val)
    db.commit()
    db.refresh(db_slide)
    return db_slide

def delete_slide(db: Session, slide_id: int):
    db_slide = get_slide(db, slide_id)
    if db_slide:
        db.delete(db_slide)
        db.commit()
        return True
    return False
