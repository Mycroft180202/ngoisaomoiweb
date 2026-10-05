from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.tour import Tour, Itinerary, TourImage
from app.models.tag import TourTag
from app.models.guide import TourGuide
from app.models.category import TourCategory
from app.schemas.tour import TourCreate, TourUpdate
from typing import Optional

def get_tour(db: Session, tour_id: int):
    return db.query(Tour).filter(Tour.id == tour_id).first()

def get_tour_by_slug(db: Session, slug: str):
    return db.query(Tour).filter(Tour.slug == slug).first()

def get_tours(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    region: Optional[str] = None,
    is_featured: Optional[bool] = None,
    search_query: Optional[str] = None,
    active_only: bool = False
):
    query = db.query(Tour)
    # Public API should only show active tours
    if active_only:
        query = query.filter(Tour.is_active == True)
    if category:
        query = query.filter(Tour.category == category)
    if region:
        query = query.filter(Tour.region == region)
    if is_featured is not None:
        query = query.filter(Tour.is_featured == is_featured)
    if search_query:
        query = query.filter(
            or_(
                Tour.title.ilike(f"%{search_query}%"),
                Tour.location.ilike(f"%{search_query}%"),
                Tour.description.ilike(f"%{search_query}%")
            )
        )
    # Order by sort_order ascending, then id descending
    return query.order_by(Tour.sort_order.asc(), Tour.id.desc()).offset(skip).limit(limit).all()

def _sync_images(db: Session, tour_id: int, images_data: list):
    """Delete existing images and create fresh ones from the provided list."""
    db.query(TourImage).filter(TourImage.tour_id == tour_id).delete()
    for img in images_data:
        db_image = TourImage(
            tour_id=tour_id,
            url=img["url"],
            image_type=img.get("image_type", "gallery"),
            is_primary=img.get("is_primary", False),
            order_index=img.get("order_index", 0),
        )
        db.add(db_image)

def create_tour(db: Session, tour: TourCreate, created_by_id: Optional[int] = None):
    db_tour = Tour(
        created_by_id=created_by_id,
        slug=tour.slug,
        title=tour.title,
        description=tour.description,
        image=tour.image,
        price=tour.price,
        duration=tour.duration,
        rating=tour.rating,
        reviews_count=tour.reviews_count,
        location=tour.location,
        category=tour.category,
        region=tour.region,
        is_featured=tour.is_featured,
        province_id=tour.province_id,
        country_id=tour.country_id,
        duration_id=tour.duration_id,
        category_id=tour.category_id,
        guide_id=tour.guide_id,
        
        # New fields
        title_en=tour.title_en,
        is_international=tour.is_international,
        group_discount=tour.group_discount,
        departure_point_id=tour.departure_point_id,
        destination_domestic_id=tour.destination_domestic_id,
        destination_foreign_id=tour.destination_foreign_id,
        is_daily=tour.is_daily,
        price_daily=tour.price_daily,
        price_promo_daily=tour.price_promo_daily,
        custom_departures=tour.custom_departures,
        recurring_days=tour.recurring_days,
        price_child=tour.price_child,
        price_infant=tour.price_infant,
        user_discount_percent=tour.user_discount_percent,
        is_promo=tour.is_promo,
        is_active=tour.is_active,
        sort_order=tour.sort_order,
        schedule_title=tour.schedule_title,
        schedule_title_en=tour.schedule_title_en,
        schedule_icon=tour.schedule_icon,
        document_url=tour.document_url,
        notes=tour.notes,
        min_group_size=tour.min_group_size,
        price_includes=tour.price_includes,
        price_excludes=tour.price_excludes,
        cancellation_policy=tour.cancellation_policy,
        payment_terms=tour.payment_terms,
        important_note=tour.important_note,
        accommodation_prices=[item.model_dump() for item in (tour.accommodation_prices or [])]
    )

    # Handle tag associations
    if tour.tag_ids:
        tags = db.query(TourTag).filter(TourTag.id.in_(tour.tag_ids)).all()
        db_tour.tags = tags

    # Handle guide associations
    if tour.guide_ids:
        guides = db.query(TourGuide).filter(TourGuide.id.in_(tour.guide_ids)).all()
        db_tour.guides = guides
        db_tour.guide_id = tour.guide_ids[0]

    # Handle category associations
    if tour.category_ids:
        categories = db.query(TourCategory).filter(TourCategory.id.in_(tour.category_ids)).all()
        db_tour.categories = categories
        db_tour.category_id = tour.category_ids[0]

    db.add(db_tour)
    db.flush()
    if not db_tour.tour_code:
        db_tour.tour_code = f"TOUR-{db_tour.id:06d}"
    db.commit()
    db.refresh(db_tour)

    # Create itinerary items
    for item in tour.itinerary:
        db_itinerary = Itinerary(
            tour_id=db_tour.id,
            day=item.day,
            title=item.title,
            content=item.content,
            title_en=item.title_en,
            icon=item.icon,
            sort_order=item.sort_order if item.sort_order is not None else item.day,
            meals=item.meals,
            overnight=item.overnight
        )
        db.add(db_itinerary)

    # Create tour images
    for idx, img in enumerate(tour.images):
        db_image = TourImage(
            tour_id=db_tour.id,
            url=img.url,
            image_type=img.image_type,
            is_primary=img.is_primary,
            order_index=img.order_index if img.order_index else idx,
        )
        db.add(db_image)

    db.commit()
    db.refresh(db_tour)
    return db_tour

def update_tour(db: Session, db_tour: Tour, tour: TourUpdate):
    update_data = tour.model_dump(exclude_unset=True)

    # Handle itinerary, images, tags, guides, and categories update separately
    itinerary_data = update_data.pop("itinerary", None)
    images_data = update_data.pop("images", None)
    tag_ids = update_data.pop("tag_ids", None)
    guide_ids = update_data.pop("guide_ids", None)
    category_ids = update_data.pop("category_ids", None)

    for key, value in update_data.items():
        setattr(db_tour, key, value)

    if tag_ids is not None:
        tags = db.query(TourTag).filter(TourTag.id.in_(tag_ids)).all()
        db_tour.tags = tags

    if guide_ids is not None:
        guides = db.query(TourGuide).filter(TourGuide.id.in_(guide_ids)).all()
        db_tour.guides = guides
        db_tour.guide_id = guide_ids[0] if guide_ids else None

    if category_ids is not None:
        categories = db.query(TourCategory).filter(TourCategory.id.in_(category_ids)).all()
        db_tour.categories = categories
        db_tour.category_id = category_ids[0] if category_ids else None

    if itinerary_data is not None:
        # Clear existing itineraries and create new ones
        db.query(Itinerary).filter(Itinerary.tour_id == db_tour.id).delete()
        for item in itinerary_data:
            db_itinerary = Itinerary(
                tour_id=db_tour.id,
                day=item["day"],
                title=item["title"],
                content=item["content"],
                title_en=item.get("title_en"),
                icon=item.get("icon"),
                sort_order=item.get("sort_order") if item.get("sort_order") is not None else item["day"],
                meals=item.get("meals"),
                overnight=item.get("overnight")
            )
            db.add(db_itinerary)

    if images_data is not None:
        _sync_images(db, db_tour.id, images_data)

    db.commit()
    db.refresh(db_tour)
    return db_tour

def delete_tour(db: Session, tour_id: int):
    db_tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if db_tour:
        db.delete(db_tour)
        db.commit()
        return True
    return False
