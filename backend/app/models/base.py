from app.core.database import Base

# This file exists to allow importing all models dynamically in Alembic
# Import all models here so that Base.metadata has access to them
from app.models.user import User
from app.models.setting import SystemSetting
from app.models.tour import Tour, Itinerary, TourAuditLog
from app.models.booking import Booking
from app.models.news import News
from app.models.country import Country
from app.models.province import ProvinceCity
from app.models.duration import TourDuration
from app.models.attraction import Attraction
from app.models.review import TourReview
from app.models.discount import DiscountCode
from app.models.guide import TourGuide
from app.models.category import TourCategory
from app.models.tag import TourTag
from app.models.quick_search import QuickSearch
from app.models.news_category import NewsCategory, NewsTag
from app.models.menu import NavigationMenu
from app.models.slide import CarouselSlide
from app.models.ad_banner import AdBanner
from app.models.office import RepresentativeOffice
from app.models.payment import PaymentMethod
from app.models.bank import BankAccount
from app.models.contact import ContactMessage
from app.models.testimonial import Testimonial
