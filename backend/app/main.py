from fastapi import FastAPI, HTTPException
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine
from sqlalchemy import text
from app.models.base import Base
from app.models.payment_transaction import PaymentTransaction
from app.routers import auth, settings, tours, bookings, news, countries, provinces, durations, attractions, reviews, discounts, guides, categories, tags, quick_searches, news_categories, menus, slides, banners, offices, payments, banks, contacts, testimonials, users, tour_schedules, media, tour_finance
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.core.config import settings as app_settings
import logging
from app.core.error_messages import localize_error_detail


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_database_exists():
    url = app_settings.DATABASE_URL
    try:
        conn = psycopg2.connect(url)
        conn.close()
    except psycopg2.OperationalError as e:
        if "does not exist" in str(e):
            try:
                last_slash = url.rfind('/')
                base_url = url[:last_slash]
                db_name = url[last_slash+1:]
                
                default_db_url = f"{base_url}/postgres"
                conn = psycopg2.connect(default_db_url)
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cursor = conn.cursor()
                cursor.execute(f"CREATE DATABASE {db_name}")
                cursor.close()
                conn.close()
                logger.info(f"Database '{db_name}' created successfully on startup.")
            except Exception as create_err:
                logger.error(f"Failed to automatically create database: {create_err}")
        else:
            logger.error(f"Database connection check failed: {e}")

# Run database checks & create tables
ensure_database_exists()
Base.metadata.create_all(bind=engine)

# Ensure columns exist in database
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username) WHERE username IS NOT NULL"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tour_audit_logs (
                id SERIAL PRIMARY KEY, tour_id INTEGER, tour_title VARCHAR,
                action VARCHAR NOT NULL, actor_id INTEGER, actor_name VARCHAR,
                actor_identifier VARCHAR, actor_role VARCHAR, changes JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tour_audit_created_at ON tour_audit_logs(created_at DESC)"))

        # Tour multi-image support – create table if not exists (safety net, Base.metadata.create_all handles it too)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tour_images (
                id SERIAL PRIMARY KEY,
                tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
                url VARCHAR NOT NULL,
                image_type VARCHAR NOT NULL DEFAULT 'gallery',
                is_primary BOOLEAN DEFAULT FALSE,
                order_index INTEGER DEFAULT 0
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tour_images_tour_id ON tour_images (tour_id)"))

        # Add relational columns to tours table if they don't exist
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS province_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS country_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS duration_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS category_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS guide_id INTEGER"))

        # New tour columns
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS title_en VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS group_discount DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS departure_point_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS destination_domestic_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS destination_foreign_id INTEGER"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_daily DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_promo_daily DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS custom_departures JSONB DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS recurring_days JSONB DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_child DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_infant DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS user_discount_percent DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS schedule_title VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS schedule_title_en VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS schedule_icon VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS document_url VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_code VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS crm_tour_id VARCHAR"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS min_group_size INTEGER DEFAULT 1"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_includes TEXT"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_excludes TEXT"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS cancellation_policy TEXT"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS payment_terms TEXT"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS important_note TEXT"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS accommodation_prices JSONB DEFAULT '[]'::jsonb"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tours_created_by_id ON tours (created_by_id)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tours_tour_code ON tours (tour_code)"))

        # Itinerary columns
        conn.execute(text("ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS title_en VARCHAR"))
        conn.execute(text("ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS icon VARCHAR"))
        conn.execute(text("ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS meals VARCHAR"))
        conn.execute(text("ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS overnight VARCHAR"))

        # Association tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tour_guide_association (
                tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
                guide_id INTEGER NOT NULL REFERENCES tour_guides(id) ON DELETE CASCADE,
                PRIMARY KEY (tour_id, guide_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tour_category_association (
                tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES tour_categories(id) ON DELETE CASCADE,
                PRIMARY KEY (tour_id, category_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tour_schedules (
                id SERIAL PRIMARY KEY,
                tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
                departure_date DATE NOT NULL,
                max_capacity INTEGER NOT NULL DEFAULT 30,
                booked_seats INTEGER NOT NULL DEFAULT 0,
                status VARCHAR NOT NULL DEFAULT 'active'
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_tour_schedules_departure_date ON tour_schedules(departure_date)
        """))
        conn.execute(text("ALTER TABLE tour_schedules ADD COLUMN IF NOT EXISTS departure_code VARCHAR"))
        conn.execute(text("ALTER TABLE tour_schedules ADD COLUMN IF NOT EXISTS crm_departure_id VARCHAR"))
        conn.execute(text("ALTER TABLE tour_schedules ADD COLUMN IF NOT EXISTS actual_cost DOUBLE PRECISION"))
        conn.execute(text("ALTER TABLE tours ADD COLUMN IF NOT EXISTS financial_config JSON DEFAULT '{}'::json"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tour_schedules_departure_code ON tour_schedules (departure_code)"))

        # User role and news category_id
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'editor'"))
        conn.execute(text("ALTER TABLE news ADD COLUMN IF NOT EXISTS category_id INTEGER"))
        conn.execute(text("ALTER TABLE news ADD COLUMN IF NOT EXISTS video_url VARCHAR"))

        # Rich advertisements (backwards compatible with existing image banners)
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS media_type VARCHAR DEFAULT 'image' NOT NULL"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS media_url VARCHAR"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS poster_url VARCHAR"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS autoplay BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS muted BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS loop BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS show_close_button BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS open_in_new_tab BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS start_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS end_at TIMESTAMP WITH TIME ZONE"))

        # Bookings payment columns
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'unpaid'"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_code VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_code VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_commission DOUBLE PRECISION DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_code VARCHAR"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_bookings_booking_code ON bookings (booking_code)"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adults_count INTEGER DEFAULT 1 NOT NULL"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0 NOT NULL"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS infants_count INTEGER DEFAULT 0 NOT NULL"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crm_sync_status VARCHAR DEFAULT 'not_synced' NOT NULL"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crm_customer_id VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crm_booking_id VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crm_last_error VARCHAR"))
        conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS crm_synced_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("UPDATE tours SET tour_code = 'TOUR-' || LPAD(id::text, 6, '0') WHERE tour_code IS NULL"))
        conn.execute(text("""
            UPDATE tours t
            SET created_by_id = source.actor_id
            FROM (
                SELECT DISTINCT ON (tour_id) tour_id, actor_id
                FROM tour_audit_logs
                WHERE action = 'create' AND actor_id IS NOT NULL
                ORDER BY tour_id, created_at ASC
            ) source
            WHERE t.id = source.tour_id AND t.created_by_id IS NULL
        """))
        conn.execute(text("UPDATE tour_schedules SET departure_code = 'DEP-' || TO_CHAR(departure_date, 'YYYYMMDD') || '-' || LPAD(id::text, 6, '0') WHERE departure_code IS NULL"))
        conn.execute(text("UPDATE bookings SET booking_code = 'NST-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(id::text, 6, '0') WHERE booking_code IS NULL"))

        # Payment transactions table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS payment_transactions (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                transaction_ref VARCHAR UNIQUE NOT NULL,
                amount DOUBLE PRECISION NOT NULL,
                bank_transaction_id VARCHAR,
                payment_method VARCHAR DEFAULT 'bank_transfer',
                status VARCHAR DEFAULT 'pending',
                casso_transaction_id VARCHAR,
                bank_account_number VARCHAR,
                transfer_content TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payment_transactions_booking_id ON payment_transactions (booking_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payment_transactions_transaction_ref ON payment_transactions (transaction_ref)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payment_transactions_status ON payment_transactions (status)"))

        conn.commit()
    logger.info("Database migration check completed successfully.")
except Exception as migrate_err:
    logger.error(f"Failed to run database migrations: {migrate_err}")


app = FastAPI(
    title="Travel Site Backend API",
    description="Python FastAPI backend for managing travel tours, settings, bookings, and news posts.",
    version="1.0.0"
)

# Mount static directory for serving uploads locally
import os
from fastapi.staticfiles import StaticFiles
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS configuration for Next.js frontend
origins = [origin.strip() for origin in app_settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def localized_http_exception_handler(request: Request, exc: HTTPException):
    original_detail = exc.detail
    translated_detail = localize_error_detail(original_detail)
    if translated_detail != original_detail:
        logger.info("Localized API error on %s: %s", request.url.path, original_detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": translated_detail},
        headers=exc.headers,
    )


@app.exception_handler(StarletteHTTPException)
async def localized_starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": localize_error_detail(exc.detail)},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def localized_validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.info("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "detail": localize_error_detail(exc.errors()),
            "message": "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.",
        },
    )


@app.exception_handler(Exception)
async def localized_unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API error on %s", request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."},
    )

@app.middleware("http")
async def enforce_sale_scope(request: Request, call_next):
    """Server-side allowlist for Sale accounts; UI hiding alone is not authorization."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        from jose import jwt, JWTError
        from app.core.database import SessionLocal
        from app.models.user import User
        try:
            payload = jwt.decode(auth_header.split(" ", 1)[1], app_settings.JWT_SECRET_KEY, algorithms=[app_settings.JWT_ALGORITHM])
            email = payload.get("sub")
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.email == email).first()
                if user and user.role == "sale":
                    path, method = request.url.path, request.method.upper()
                    readable = (
                        "/api/auth/", "/api/tours", "/api/bookings", "/api/contacts",
                        "/api/countries", "/api/provinces", "/api/durations", "/api/categories",
                        "/api/guides", "/api/tags", "/api/attractions", "/api/payments/transactions",
                    )
                    allowed = any(path.startswith(prefix) for prefix in readable)
                    if not allowed:
                        return JSONResponse(status_code=403, content={"detail": "Tài khoản Sale không có quyền truy cập phân hệ này"})
                    if method not in {"GET", "HEAD", "OPTIONS"}:
                        mutation_allowed = path.startswith("/api/bookings") or (path.startswith("/api/contacts") and method != "DELETE") or path.startswith("/api/auth/me")
                        mutation_allowed = mutation_allowed or (path.startswith("/api/tours") and request.method.upper() != "DELETE" and "/sync-crm" not in path)
                        if not mutation_allowed or path.startswith("/api/payments/transactions"):
                            return JSONResponse(status_code=403, content={"detail": "Tài khoản Sale chỉ được thao tác Tour, booking và liên hệ khách hàng"})
            finally:
                db.close()
        except JWTError:
            pass
    return await call_next(request)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(tours.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(countries.router, prefix="/api")
app.include_router(provinces.router, prefix="/api")
app.include_router(durations.router, prefix="/api")
app.include_router(attractions.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(discounts.router, prefix="/api")
app.include_router(guides.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(quick_searches.router, prefix="/api")
app.include_router(news_categories.router, prefix="/api")
app.include_router(menus.router, prefix="/api")
app.include_router(slides.router, prefix="/api")
app.include_router(banners.router, prefix="/api")
app.include_router(banners.public_router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(offices.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(banks.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(testimonials.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tour_schedules.router, prefix="/api")
app.include_router(tour_finance.router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Travel Site API",
        "docs_url": "/docs"
    }

def seed_initial_data():
    from app.core.database import SessionLocal
    from app.models.country import Country
    from app.models.province import ProvinceCity
    from app.models.duration import TourDuration
    from app.models.category import TourCategory
    from app.models.tag import TourTag
    
    db = SessionLocal()
    try:
        # Seed Countries
        if db.query(Country).count() == 0:
            vietnam = Country(name="Việt Nam", slug="viet-nam", image="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80")
            japan = Country(name="Nhật Bản", slug="nhat-ban", image="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80")
            korea = Country(name="Hàn Quốc", slug="han-quoc", image="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80")
            db.add_all([vietnam, japan, korea])
            db.commit()

        # Seed Provinces
        if db.query(ProvinceCity).count() == 0:
            vietnam_db = db.query(Country).filter(Country.slug == "viet-nam").first()
            if vietnam_db:
                hanoi = ProvinceCity(name="Hà Nội", slug="ha-noi", country_id=vietnam_db.id, image="https://images.unsplash.com/photo-1509060464153-44667396260f?auto=format&fit=crop&w=600&q=80")
                danang = ProvinceCity(name="Đà Nẵng", slug="da-nang", country_id=vietnam_db.id, image="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80")
                hcm = ProvinceCity(name="TP. Hồ Chí Minh", slug="tp-ho-chi-minh", country_id=vietnam_db.id, image="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80")
                nhatrang = ProvinceCity(name="Nha Trang", slug="nha-trang", country_id=vietnam_db.id, image="https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=600&q=80")
                phuquoc = ProvinceCity(name="Phú Quốc", slug="phu-quoc", country_id=vietnam_db.id, image="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=600&q=80")
                db.add_all([hanoi, danang, hcm, nhatrang, phuquoc])
                db.commit()

        # Seed Durations
        if db.query(TourDuration).count() == 0:
            d1 = TourDuration(name="3 ngày 2 đêm", days=3, nights=2)
            d2 = TourDuration(name="4 ngày 3 đêm", days=4, nights=3)
            d3 = TourDuration(name="5 ngày 4 đêm", days=5, nights=4)
            d4 = TourDuration(name="1 ngày (Trong ngày)", days=1, nights=0)
            db.add_all([d1, d2, d3, d4])
            db.commit()

        # Seed Categories
        if db.query(TourCategory).count() == 0:
            c1 = TourCategory(name="Tour ghép đoàn", slug="tour-ghep-doan", description="Tour ghép lẻ khởi hành hàng ngày/hàng tuần")
            c2 = TourCategory(name="Tour thiết kế riêng", slug="tour-thiet-ke-rieng", description="Tour du lịch thiết kế theo nhu cầu đoàn riêng")
            c3 = TourCategory(name="Tour nghỉ dưỡng", slug="tour-nghi-duong", description="Các tour tập trung vào trải nghiệm resort nghỉ dưỡng cao cấp")
            db.add_all([c1, c2, c3])
            db.commit()

        # Seed Tags
        if db.query(TourTag).count() == 0:
            t1 = TourTag(name="Giá Tốt", slug="gia-tot")
            t2 = TourTag(name="Bán Chạy", slug="ban-chay")
            t3 = TourTag(name="Mùa Hè", slug="mua-he")
            t4 = TourTag(name="Khuyến Mãi", slug="khuyen-mai")
            db.add_all([t1, t2, t3, t4])
            db.commit()

        # Seed Quick Searches
        from app.models.quick_search import QuickSearch
        if db.query(QuickSearch).count() == 0:
            q1 = QuickSearch(keyword="Đà Nẵng", link_url="#booking", order_index=1)
            q2 = QuickSearch(keyword="Phú Quốc", link_url="#booking", order_index=2)
            q3 = QuickSearch(keyword="Hà Giang", link_url="#booking", order_index=3)
            db.add_all([q1, q2, q3])
            db.commit()

        # Seed NewsCategory
        from app.models.news_category import NewsCategory, NewsTag
        if db.query(NewsCategory).count() == 0:
            cat1 = NewsCategory(name="Cẩm nang du lịch", slug="cam-nang-du-lich", description="Kinh nghiệm du lịch bụi, tự túc từ A-Z")
            cat2 = NewsCategory(name="Tin tức sự kiện", slug="tin-tuc-su-kien", description="Các tin tức mới về lễ hội, sự kiện du lịch nổi bật")
            db.add_all([cat1, cat2])
            db.commit()

        # Seed NewsTag
        if db.query(NewsTag).count() == 0:
            tag1 = NewsTag(name="Du lịch tự túc", slug="du-lich-tu-tuc")
            tag2 = NewsTag(name="Kinh nghiệm du lịch", slug="kinh-nghiem-du-lich")
            tag3 = NewsTag(name="Ẩm thực vùng miền", slug="am-thuc-vung-mien")
            db.add_all([tag1, tag2, tag3])
            db.commit()

        # Seed NavigationMenu
        from app.models.menu import NavigationMenu
        if db.query(NavigationMenu).count() == 0:
            m1 = NavigationMenu(title="Trang chủ", url="/", order_index=1)
            m2 = NavigationMenu(title="Giới thiệu", url="/about", order_index=2)
            m3 = NavigationMenu(title="Tour du lịch", url="/tours", order_index=3)
            m4 = NavigationMenu(title="Tin tức", url="/news", order_index=4)
            m5 = NavigationMenu(title="Liên hệ", url="/contact", order_index=5)
            db.add_all([m1, m2, m3, m4, m5])
            db.commit()

        # Seed CarouselSlide
        from app.models.slide import CarouselSlide
        if db.query(CarouselSlide).count() == 0:
            s1 = CarouselSlide(title="Khám phá Việt Nam kỳ vĩ", subtitle="Tour ghép trọn gói chất lượng cao 2026", image_url="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80", link_url="/tours", order_index=1)
            db.add(s1)
            db.commit()

        # Seed AdBanner
        from app.models.ad_banner import AdBanner
        if db.query(AdBanner).count() == 0:
            b1 = AdBanner(title="Banner ưu đãi hè rực rỡ", image_url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80", link_url="/tours", position="home_sidebar", order_index=1)
            db.add(b1)
            db.commit()

        # Seed RepresentativeOffice
        from app.models.office import RepresentativeOffice
        if db.query(RepresentativeOffice).count() == 0:
            o1 = RepresentativeOffice(name="Trụ sở chính Hà Nội", address="123 Đường Lê Lợi, Quận Hoàn Kiếm, Hà Nội", phone="024-3333-3333", hotline="0988-888-888", email="hanoi@startour.vn", order_index=1)
            o2 = RepresentativeOffice(name="Chi nhánh TP.HCM", address="456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh", phone="028-6666-6666", hotline="0977-777-777", email="hcm@startour.vn", order_index=2)
            db.add_all([o1, o2])
            db.commit()

        # Seed PaymentMethod
        from app.models.payment import PaymentMethod
        if db.query(PaymentMethod).count() == 0:
            p1 = PaymentMethod(name="Chuyển khoản ngân hàng", description="Chuyển khoản online qua ứng dụng ngân hàng quét mã QR", is_active=True)
            p2 = PaymentMethod(name="Tiền mặt tại văn phòng", description="Thanh toán trực tiếp bằng tiền mặt tại các văn phòng đại diện", is_active=True)
            db.add_all([p1, p2])
            db.commit()

        # Seed BankAccount
        from app.models.bank import BankAccount
        if db.query(BankAccount).count() == 0:
            bank1 = BankAccount(bank_name="Vietcombank", account_name="CONG TY DU LICH STARTOUR", account_number="1029384756", branch="Sở giao dịch Hà Nội", is_active=True)
            db.add(bank1)
            db.commit()

        # Seed Testimonial
        from app.models.testimonial import Testimonial
        if db.query(Testimonial).count() == 0:
            test1 = Testimonial(customer_name="Nguyễn Văn An", customer_role="Khách du lịch tự túc Sapa", comment="Dịch vụ tour chu đáo, hướng dẫn viên nhiệt tình, lịch trình rất hợp lý. Nhất định sẽ quay lại chọn StarTour!", rating=5.0, is_active=True)
            db.add(test1)
            db.commit()

        logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
    finally:
        db.close()

# Run database seeding on startup
try:
    seed_initial_data()
except Exception as seed_err:
    logger.error(f"Failed to seed initial database data: {seed_err}")
