from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str
    
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REFRESH_TOKEN: str = ""
    GOOGLE_DRIVE_FOLDER_ID: str = ""

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    ZALO_OA_ACCESS_TOKEN: str = ""
    ZALO_TEMPLATE_ID: str = ""

    PAYOS_CLIENT_ID: str = ""
    PAYOS_API_KEY: str = ""
    PAYOS_CHECKSUM_KEY: str = ""
    ONLINE_PAYMENTS_ENABLED: bool = False
    CASSO_SECURE_TOKEN: str = ""

    # Optional CRM integration. Leave CRM_API_URL empty to keep sync disabled.
    CRM_API_URL: str = ""
    CRM_BOOKING_ENDPOINT: str = "/api/integrations/website/bookings"
    CRM_TOUR_ENDPOINT: str = "/api/integrations/website/tours"
    CRM_API_KEY: str = ""
    CRM_WEBHOOK_SECRET: str = ""

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

settings = Settings()

