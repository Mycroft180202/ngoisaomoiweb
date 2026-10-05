from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import datetime, date
from app.schemas.country import CountryResponse
from app.schemas.province import ProvinceResponse
from app.schemas.duration import DurationResponse
from app.schemas.category import CategoryResponse
from app.schemas.guide import GuideResponse
from app.schemas.tag import TagResponse
from app.schemas.review import ReviewResponse

# ── TourImage schemas ───────────────────────────────────────────────────────

class TourImageCreate(BaseModel):
    url: str
    image_type: str = "gallery"   # "banner" or "gallery"
    is_primary: bool = False
    order_index: int = 0

class TourImageResponse(BaseModel):
    id: int
    tour_id: int
    url: str
    image_type: str
    is_primary: bool
    order_index: int

    class Config:
        from_attributes = True

# ── Itinerary schemas ───────────────────────────────────────────────────────

class ItineraryBase(BaseModel):
    day: int
    title: str
    content: str
    title_en: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = 0
    meals: Optional[str] = None
    overnight: Optional[str] = None

class ItineraryCreate(ItineraryBase):
    pass

class ItineraryResponse(ItineraryBase):
    id: int
    tour_id: int

    class Config:
        from_attributes = True

# ── TourSchedule schemas ─────────────────────────────────────────────────────

class TourScheduleResponse(BaseModel):
    id: int
    tour_id: int
    departure_code: Optional[str] = None
    crm_departure_id: Optional[str] = None
    departure_date: date
    max_capacity: int
    booked_seats: int
    status: str

    class Config:
        from_attributes = True

class AccommodationPrice(BaseModel):
    hotel_stars: int = Field(ge=1, le=5)
    room_type: str = Field(min_length=1, max_length=120)
    guests_per_room: int = Field(ge=1, le=20)
    adult_price: float = Field(ge=0)
    child_price: float = Field(default=0, ge=0)
    single_supplement: float = Field(default=0, ge=0)

# ── Tour schemas ─────────────────────────────────────────────────────────────

class TourBase(BaseModel):
    tour_code: Optional[str] = None
    crm_tour_id: Optional[str] = None
    created_by_id: Optional[int] = None
    slug: str
    title: str
    description: Optional[str] = None
    image: Optional[str] = None          # Legacy fallback field
    price: float
    duration: str
    rating: Optional[float] = 5.0
    reviews_count: Optional[int] = 0
    location: str
    category: str                        # inbound, outbound
    region: str                          # Miền Bắc, Miền Trung, Miền Nam, Châu Á, v.v.
    is_featured: Optional[bool] = False
    province_id: Optional[int] = None
    country_id: Optional[int] = None
    duration_id: Optional[int] = None
    category_id: Optional[int] = None
    guide_id: Optional[int] = None

    # New fields
    title_en: Optional[str] = None
    is_international: Optional[bool] = False
    group_discount: Optional[float] = 0.0
    departure_point_id: Optional[int] = None
    destination_domestic_id: Optional[int] = None
    destination_foreign_id: Optional[int] = None
    is_daily: Optional[bool] = False
    price_daily: Optional[float] = 0.0
    price_promo_daily: Optional[float] = 0.0
    custom_departures: Optional[list] = []
    recurring_days: Optional[list] = []
    price_child: Optional[float] = 0.0
    price_infant: Optional[float] = 0.0
    user_discount_percent: Optional[float] = 0.0
    is_promo: Optional[bool] = False
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0
    schedule_title: Optional[str] = None
    schedule_title_en: Optional[str] = None
    schedule_icon: Optional[str] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None
    min_group_size: Optional[int] = Field(default=1, ge=1)
    price_includes: Optional[str] = None
    price_excludes: Optional[str] = None
    cancellation_policy: Optional[str] = None
    payment_terms: Optional[str] = None
    important_note: Optional[str] = None
    accommodation_prices: Optional[List[AccommodationPrice]] = []

    @model_validator(mode="after")
    def validate_destination_type(self):
        if self.is_international:
            if self.destination_domestic_id is not None:
                raise ValueError("Tour quốc tế không được chọn điểm đến trong nước")
        elif self.destination_foreign_id is not None:
            raise ValueError("Tour trong nước không được chọn điểm đến nước ngoài")
        if self.price < 0 or (self.price_child or 0) < 0 or (self.price_infant or 0) < 0:
            raise ValueError("Giá tour không được là số âm")
        return self

class TourCreate(TourBase):
    itinerary: List[ItineraryCreate] = []
    images: List[TourImageCreate] = []
    tag_ids: Optional[List[int]] = []
    guide_ids: Optional[List[int]] = []
    category_ids: Optional[List[int]] = []

class TourUpdate(BaseModel):
    tour_code: Optional[str] = None
    crm_tour_id: Optional[str] = None
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    duration: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    location: Optional[str] = None
    category: Optional[str] = None
    region: Optional[str] = None
    is_featured: Optional[bool] = None
    province_id: Optional[int] = None
    country_id: Optional[int] = None
    duration_id: Optional[int] = None
    category_id: Optional[int] = None
    guide_id: Optional[int] = None

    # New fields
    title_en: Optional[str] = None
    is_international: Optional[bool] = None
    group_discount: Optional[float] = None
    departure_point_id: Optional[int] = None
    destination_domestic_id: Optional[int] = None
    destination_foreign_id: Optional[int] = None
    is_daily: Optional[bool] = None
    price_daily: Optional[float] = None
    price_promo_daily: Optional[float] = None
    custom_departures: Optional[list] = None
    recurring_days: Optional[list] = None
    price_child: Optional[float] = None
    price_infant: Optional[float] = None
    user_discount_percent: Optional[float] = None
    is_promo: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    schedule_title: Optional[str] = None
    schedule_title_en: Optional[str] = None
    schedule_icon: Optional[str] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None
    min_group_size: Optional[int] = Field(default=None, ge=1)
    price_includes: Optional[str] = None
    price_excludes: Optional[str] = None
    cancellation_policy: Optional[str] = None
    payment_terms: Optional[str] = None
    important_note: Optional[str] = None
    accommodation_prices: Optional[List[AccommodationPrice]] = None

    @model_validator(mode="after")
    def validate_destination_type(self):
        if self.is_international is True and self.destination_domestic_id is not None:
            raise ValueError("Tour quốc tế không được chọn điểm đến trong nước")
        if self.is_international is False and self.destination_foreign_id is not None:
            raise ValueError("Tour trong nước không được chọn điểm đến nước ngoài")
        return self

    itinerary: Optional[List[ItineraryCreate]] = None
    images: Optional[List[TourImageCreate]] = None
    tag_ids: Optional[List[int]] = None
    guide_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None

class TourResponse(TourBase):
    id: int
    created_at: datetime
    itinerary: List[ItineraryResponse] = []
    images: List[TourImageResponse] = []
    province: Optional[ProvinceResponse] = None
    country: Optional[CountryResponse] = None
    tour_duration: Optional[DurationResponse] = None
    tour_category: Optional[CategoryResponse] = None
    guide: Optional[GuideResponse] = None
    tags: List[TagResponse] = []
    reviews: List[ReviewResponse] = []

    # New relationships
    departure_point: Optional[ProvinceResponse] = None
    destination_domestic: Optional[ProvinceResponse] = None
    destination_foreign: Optional[CountryResponse] = None
    guides: List[GuideResponse] = []
    categories: List[CategoryResponse] = []
    schedules: List[TourScheduleResponse] = []

    class Config:
        from_attributes = True
