from sqlalchemy.orm import Session
from app.models.testimonial import Testimonial
from app.schemas.testimonial import TestimonialCreate

def get_testimonial(db: Session, testimonial_id: int):
    return db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()

def get_all_testimonials(db: Session):
    return db.query(Testimonial).order_by(Testimonial.customer_name).all()

def create_testimonial(db: Session, test: TestimonialCreate):
    db_test = Testimonial(
        customer_name=test.customer_name,
        customer_role=test.customer_role,
        avatar_url=test.avatar_url,
        rating=test.rating,
        comment=test.comment,
        is_active=test.is_active
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

def update_testimonial(db: Session, db_test: Testimonial, test_data: dict):
    for key, val in test_data.items():
        setattr(db_test, key, val)
    db.commit()
    db.refresh(db_test)
    return db_test

def delete_testimonial(db: Session, testimonial_id: int):
    db_test = get_testimonial(db, testimonial_id)
    if db_test:
        db.delete(db_test)
        db.commit()
        return True
    return False
