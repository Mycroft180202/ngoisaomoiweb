from sqlalchemy.orm import Session
from app.models.review import TourReview
from app.schemas.review import ReviewCreate

def get_review(db: Session, review_id: int):
    return db.query(TourReview).filter(TourReview.id == review_id).first()

def get_reviews(db: Session, skip: int = 0, limit: int = 100):
    return db.query(TourReview).offset(skip).limit(limit).all()

def get_tour_reviews(db: Session, tour_id: int):
    return db.query(TourReview).filter(TourReview.tour_id == tour_id, TourReview.is_approved == True).all()

def create_review(db: Session, review: ReviewCreate):
    db_review = TourReview(
        tour_id=review.tour_id,
        customer_name=review.customer_name,
        rating=review.rating,
        comment=review.comment,
        is_approved=review.is_approved
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

def update_review(db: Session, db_review: TourReview, review_in: ReviewCreate):
    db_review.customer_name = review_in.customer_name
    db_review.rating = review_in.rating
    db_review.comment = review_in.comment
    db_review.is_approved = review_in.is_approved
    db.commit()
    db.refresh(db_review)
    return db_review

def delete_review(db: Session, review_id: int):
    db_review = db.query(TourReview).filter(TourReview.id == review_id).first()
    if db_review:
        db.delete(db_review)
        db.commit()
        return True
    return False
