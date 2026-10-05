from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Mật khẩu phải chứa ít nhất 8 ký tự.")

class AdminUserCreate(UserCreate):
    is_admin: bool = True
    role: str = "editor"

class SaleUserAutoCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, description="Mật khẩu phải chứa ít nhất 8 ký tự.")

class AdminUserUpdate(UserUpdate):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    role: Optional[str] = None
    phone_verified: Optional[bool] = None
    email_verified: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    username: Optional[str] = None
    is_active: bool
    is_admin: bool
    role: str
    must_change_password: bool = False
    phone_verified: bool
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class SocialLoginRequest(BaseModel):
    provider: str  # google
    social_id: str
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class OAuthTokenRequest(BaseModel):
    access_token: str

class VerifyOTPRequest(BaseModel):
    otp: str
