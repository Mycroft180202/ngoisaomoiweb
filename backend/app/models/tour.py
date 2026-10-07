from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func, Table, JSON, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

tour_guide_association = Table(
    "tour_guide_association",
    Base.metadata,
    Column("tour_id", Integer, ForeignKey("tours.id", ondelete="CASCADE"), primary_key=True),
    Column("guide_id", Integer, ForeignKey("tour_guides.id", ondelete="CASCADE"), primary_key=True)
)

tour_category_association = Table(
    "tour_category_association",
    Base.metadata,
    Column("tour_id", Integer, ForeignKey("tours.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("tour_categories.id", ondelete="CASCADE"), primary_key=True)
)

class Tour(Base):
    __tablename__ = "tours"

    id = Column(Integer, primary_key=True, index=True)
    tour_code = Column(String, unique=True, index=True, nullable=True)
    crm_tour_id = Column(String, nullable=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)  # Legacy fallback image field
    price = Column(Float, nullable=False)
    duration = Column(String, nullable=False)
    rating = Column(Float, default=5.0)
    reviews_count = Column(Integer, default=0)
    location = Column(String, nullable=False)
    category = Column(String, nullable=False)  # e.g., inbound, outbound
    region = Column(String, nullable=False)    # e.g., Miền Bắc, Miền Trung, Miền Nam, Châu Á
    is_featured = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # New relational foreign keys
    province_id = Column(Integer, ForeignKey("province_cities.id", ondelete="SET NULL"), nullable=True)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="SET NULL"), nullable=True)
    duration_id = Column(Integer, ForeignKey("tour_durations.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(Integer, ForeignKey("tour_categories.id", ondelete="SET NULL"), nullable=True)
    guide_id = Column(Integer, ForeignKey("tour_guides.id", ondelete="SET NULL"), nullable=True)

    # Added fields
    title_en = Column(String, nullable=True)
    is_international = Column(Boolean, default=False)
    group_discount = Column(Float, default=0.0)
    departure_point_id = Column(Integer, ForeignKey("province_cities.id", ondelete="SET NULL"), nullable=True)
    destination_domestic_id = Column(Integer, ForeignKey("province_cities.id", ondelete="SET NULL"), nullable=True)
    destination_foreign_id = Column(Integer, ForeignKey("countries.id", ondelete="SET NULL"), nullable=True)
    is_daily = Column(Boolean, default=False)
    price_daily = Column(Float, default=0.0)
    price_promo_daily = Column(Float, default=0.0)
    custom_departures = Column(JSON, default=list)
    recurring_days = Column(JSON, default=list)
    price_child = Column(Float, default=0.0)
    price_infant = Column(Float, default=0.0)
    user_discount_percent = Column(Float, default=0.0)
    is_promo = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    schedule_title = Column(String, nullable=True)
    schedule_title_en = Column(String, nullable=True)
    schedule_icon = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    min_group_size = Column(Integer, default=1)
    price_includes = Column(String, nullable=True)
    price_excludes = Column(String, nullable=True)
    cancellation_policy = Column(String, nullable=True)
    payment_terms = Column(String, nullable=True)
    important_note = Column(String, nullable=True)
    accommodation_prices = Column(JSON, default=list)
    financial_config = Column(JSON, default=dict)

    # Relationships
    province = relationship("ProvinceCity", foreign_keys=[province_id], back_populates="tours", lazy="selectin")
    country = relationship("Country", foreign_keys=[country_id], back_populates="tours", lazy="selectin")
    tour_duration = relationship("TourDuration", back_populates="tours", lazy="selectin")
    tour_category = relationship("TourCategory", foreign_keys=[category_id], back_populates="tours", lazy="selectin")
    guide = relationship("TourGuide", foreign_keys=[guide_id], back_populates="tours", lazy="selectin")
    tags = relationship("TourTag", secondary="tour_tag_association", back_populates="tours", lazy="selectin")
    reviews = relationship("TourReview", back_populates="tour", cascade="all, delete-orphan", lazy="selectin")

    itinerary = relationship("Itinerary", back_populates="tour", cascade="all, delete-orphan", lazy="selectin")
    bookings = relationship("Booking", back_populates="tour")
    images = relationship("TourImage", back_populates="tour", cascade="all, delete-orphan", lazy="selectin", order_by="TourImage.order_index")
    schedules = relationship("TourSchedule", back_populates="tour", cascade="all, delete-orphan", lazy="selectin")

    # New many-to-many relationships
    guides = relationship("TourGuide", secondary=tour_guide_association, back_populates="tours_many", lazy="selectin")
    categories = relationship("TourCategory", secondary=tour_category_association, back_populates="tours_many", lazy="selectin")
    
    # Destination/Departure relationships
    departure_point = relationship("ProvinceCity", foreign_keys=[departure_point_id], lazy="selectin")
    destination_domestic = relationship("ProvinceCity", foreign_keys=[destination_domestic_id], lazy="selectin")
    destination_foreign = relationship("Country", foreign_keys=[destination_foreign_id], lazy="selectin")

class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("tours.id", ondelete="CASCADE"), nullable=False)
    day = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    title_en = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    meals = Column(String, nullable=True)
    overnight = Column(String, nullable=True)

    tour = relationship("Tour", back_populates="itinerary")

class TourImage(Base):
    __tablename__ = "tour_images"

    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("tours.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    image_type = Column(String, nullable=False, default="gallery")  # "banner" or "gallery"
    is_primary = Column(Boolean, default=False)  # Primary thumbnail for listing/homepage
    order_index = Column(Integer, default=0)

    tour = relationship("Tour", back_populates="images")

class TourSchedule(Base):
    __tablename__ = "tour_schedules"

    id = Column(Integer, primary_key=True, index=True)
    departure_code = Column(String, unique=True, index=True, nullable=True)
    crm_departure_id = Column(String, nullable=True)
    tour_id = Column(Integer, ForeignKey("tours.id", ondelete="CASCADE"), nullable=False)
    departure_date = Column(Date, nullable=False, index=True)
    max_capacity = Column(Integer, nullable=False)
    booked_seats = Column(Integer, nullable=False, default=0)
    status = Column(String, default="active")  # active, locked, cancelled
    actual_cost = Column(Float, nullable=True)  # Expense total excluding partner commission; None uses estimates.

    tour = relationship("Tour", back_populates="schedules")

class TourAuditLog(Base):
    __tablename__ = "tour_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, nullable=True, index=True)
    tour_title = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)  # create, update, delete
    actor_id = Column(Integer, nullable=True, index=True)
    actor_name = Column(String, nullable=True)
    actor_identifier = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    changes = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
