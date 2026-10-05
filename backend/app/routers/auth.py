from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Iterable
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.crud.user import get_user_by_email, get_user_by_login, create_user
import uuid
import urllib.request
import urllib.error
import json
from app.schemas.user import Token, UserResponse, UserCreate, UserUpdate, SocialLoginRequest, OAuthTokenRequest, VerifyOTPRequest
from app.models.user import User
from app.services.storage import storage_service
from app.services.mail import send_verification_email
from app.services.zalo import send_zalo_otp
from app.core.rate_limit import login_rate_limiter, register_rate_limiter, otp_rate_limiter
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
security_bearer = HTTPBearer(auto_error=False)

email_otps = {}
phone_otps = {}

def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer), db: Session = Depends(get_db)) -> Optional[User]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = get_user_by_email(db, email=email)
        if user and not user.is_active:
            return None
        return user
    except JWTError:
        return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động"
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập chức năng quản trị"
        )
    return current_user

def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin or current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quyền hạn yêu cầu cấp độ Super Admin"
        )
    return current_user

def ensure_admin_roles(current_user: User, allowed_roles: Iterable[str], detail: str = "Bạn không có quyền thực hiện thao tác này") -> User:
    """Enforce a finer-grained admin role inside an endpoint."""
    if not current_user.is_admin or current_user.role not in set(allowed_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
    return current_user

@router.post("/login", response_model=Token)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    login_rate_limiter.check_rate_limit(request)
    user = get_user_by_login(db, login=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động"
        )
    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserResponse)
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    register_rate_limiter.check_rate_limit(request)
    existing = get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this email is the configured admin email
    is_admin = (user_in.email.strip().lower() == "blabla180202@gmail.com")
    if not is_admin:
        user_count = db.query(User).count()
        is_admin = (user_count == 0)
        
    return create_user(db, user=user_in, is_admin=is_admin, role="super_admin" if is_admin else "editor")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_in.email is not None:
        existing = get_user_by_email(db, email=user_in.email)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        if current_user.email != user_in.email:
            current_user.email = user_in.email
            current_user.email_verified = False

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name

    if user_in.phone is not None:
        if current_user.phone != user_in.phone:
            current_user.phone = user_in.phone
            current_user.phone_verified = False

    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url

    # Note: Google account linking/unlinking is handled via POST /auth/google endpoint

    if user_in.password is not None and user_in.password.strip() != "":
        from app.core.security import get_password_hash
        current_user.hashed_password = get_password_hash(user_in.password)
        current_user.must_change_password = False

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/google", response_model=Token)
def google_auth(
    request: OAuthTokenRequest, 
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    try:
        # Call Google API
        req = urllib.request.Request(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {request.access_token}"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            user_info = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {e.read().decode()}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication request failed: {str(e)}"
        )
        
    google_id = user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name")
    avatar_url = user_info.get("picture")
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve basic profile from Google"
        )
        
    current_user = get_optional_current_user(credentials, db)
    
    if current_user:
        # User is already logged in, they are trying to LINK their Google account
        # Check if another user is already linked to this google_id
        conflict_user = db.query(User).filter(User.google_id == google_id).first()
        if conflict_user and conflict_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài khoản Google này đã được liên kết với một người dùng khác"
            )
        current_user.google_id = google_id
        current_user.avatar_url = avatar_url
        current_user.full_name = name
        current_user.email_verified = True
        db.commit()
        db.refresh(current_user)
        db_user = current_user
    else:
        # Standard login / registration flow
        # Check if user already linked with this google_id
        db_user = db.query(User).filter(User.google_id == google_id).first()
        
        # If not found by google_id, check email
        if not db_user:
            db_user = db.query(User).filter(User.email == email).first()
            if db_user:
                # Link accounts
                db_user.google_id = google_id
                db_user.avatar_url = avatar_url
                db_user.full_name = name
                db_user.email_verified = True
                db.commit()
                db.refresh(db_user)
        else:
            # If logging in via Google, always update details because Google has higher priority!
            db_user.avatar_url = avatar_url
            db_user.full_name = name
            db_user.email_verified = True
            db.commit()
            db.refresh(db_user)
            
        # If still not found, create new user
        if not db_user:
            is_admin = (email.strip().lower() == "blabla180202@gmail.com")
            if not is_admin:
                user_count = db.query(User).count()
                is_admin = (user_count == 0)
            
            random_password = uuid.uuid4().hex
            from app.core.security import get_password_hash
            hashed_password = get_password_hash(random_password)
            
            db_user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=name,
                avatar_url=avatar_url,
                is_active=True,
                is_admin=is_admin,
                google_id=google_id,
                email_verified=True
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động"
        )
        
    access_token = create_access_token(subject=db_user.email)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/upload-avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không được phép đổi avatar đối với tài khoản liên kết Google"
        )
    
    # Strictly validate file extensions and mime types to prevent shell uploads
    allowed_extensions = {"jpg", "jpeg", "png", "gif", "webp"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ cho phép tải lên các tệp tin hình ảnh (.jpg, .jpeg, .png, .gif, .webp)."
        )

    allowed_content_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng tệp tin ảnh không hợp lệ."
        )
    
    try:
        content = file.file.read()
        ext = file.filename.split(".")[-1]
        unique_filename = f"avatars/{uuid.uuid4()}.{ext}"
        
        file_url = storage_service.upload_file(
            file_content=content,
            filename=unique_filename,
            content_type=file.content_type
        )
        
        current_user.avatar_url = file_url
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tải ảnh đại diện thất bại: {str(e)}"
        )

@router.post("/send-email-otp")
def send_email_otp(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otp_rate_limiter.check_rate_limit(request)
    code = "".join(random.choices("0123456789", k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    sent = send_verification_email(current_user.email, code)
    if sent:
        email_otps[current_user.id] = (code, expires_at)
        return {"detail": "Mã xác thực đã được gửi đến email của bạn", "otp_sent": True}
    else:
        email_otps[current_user.id] = ("123456", expires_at)
        return {
            "detail": "SMTP chưa được cấu hình. Bạn có thể sử dụng mã OTP giả lập: 123456 để xác thực.",
            "otp_sent": True,
            "mock": True
        }

@router.post("/verify-email-otp")
def verify_email_otp(
    request: Request,
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otp_rate_limiter.check_rate_limit(request)
    otp_data = email_otps.get(current_user.id)
    if not otp_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy mã OTP nào đang chờ xác thực cho tài khoản này."
        )
        
    stored_code, expires_at = otp_data
    if datetime.now(timezone.utc) > expires_at:
        if current_user.id in email_otps:
            del email_otps[current_user.id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP đã hết hạn."
        )
        
    if payload.otp != stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không chính xác."
        )
        
    current_user.email_verified = True
    db.commit()
    db.refresh(current_user)
    
    if current_user.id in email_otps:
        del email_otps[current_user.id]
        
    return current_user

@router.post("/send-phone-otp")
def send_phone_otp(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otp_rate_limiter.check_rate_limit(request)
    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cập nhật số điện thoại trước khi xác thực"
        )
        
    code = "".join(random.choices("0123456789", k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    sent = send_zalo_otp(current_user.phone, code)
    if sent:
        phone_otps[current_user.id] = (code, expires_at)
        return {
            "detail": f"Mã xác thực đã được gửi qua Zalo OA đến số điện thoại {current_user.phone}.",
            "otp_sent": True
        }
    else:
        phone_otps[current_user.id] = ("123456", expires_at)
        return {
            "detail": f"Zalo OA chưa được cấu hình. Bạn có thể sử dụng mã OTP giả lập: 123456 để xác thực.",
            "otp_sent": True,
            "mock": True
        }

@router.post("/verify-phone-otp")
def verify_phone_otp(
    request: Request,
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otp_rate_limiter.check_rate_limit(request)
    otp_data = phone_otps.get(current_user.id)
    if not otp_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy mã OTP nào đang chờ xác thực cho tài khoản này."
        )
        
    stored_code, expires_at = otp_data
    if datetime.now(timezone.utc) > expires_at:
        if current_user.id in phone_otps:
            del phone_otps[current_user.id]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP đã hết hạn."
        )
        
    if payload.otp != stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không chính xác."
        )
        
    current_user.phone_verified = True
    db.commit()
    db.refresh(current_user)
    
    if current_user.id in phone_otps:
        del phone_otps[current_user.id]
        
    return current_user
