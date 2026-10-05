from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base

class AdBanner(Base):
    __tablename__ = "ad_banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    image_url = Column(String, nullable=False)
    media_type = Column(String, default="image", nullable=False)
    media_url = Column(String, nullable=True)
    poster_url = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    position = Column(String, default="home_sidebar")  # e.g. home_sidebar, footer_banner
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    autoplay = Column(Boolean, default=True)
    muted = Column(Boolean, default=True)
    loop = Column(Boolean, default=True)
    show_close_button = Column(Boolean, default=True)
    open_in_new_tab = Column(Boolean, default=True)
    start_at = Column(DateTime(timezone=True), nullable=True)
    end_at = Column(DateTime(timezone=True), nullable=True)
