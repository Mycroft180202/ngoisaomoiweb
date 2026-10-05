from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import hmac

from app.core.database import get_db
from app.crud.booking import get_booking, get_bookings, create_booking, update_booking
from app.schemas.booking import BookingResponse, BookingCreate, BookingUpdate, PaymentProofSubmit, BookingLookup, CrmBookingStatusUpdate
from app.core.config import settings
from app.routers.auth import get_current_user, get_optional_current_user
from app.models.user import User
from app.services.mail import send_booking_email, send_booking_confirmed_email, send_booking_cancelled_email
from app.core.rate_limit import booking_rate_limiter, booking_lookup_rate_limiter
from app.services.crm_sync import sync_booking_to_crm
from app.services.payment_config import online_payments_enabled


router = APIRouter(prefix="/bookings", tags=["Bookings Management"])


@router.post("/integrations/crm/status")
def update_status_from_crm(
    request: Request,
    update: CrmBookingStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    from app.models.booking import Booking

    if not settings.CRM_CALLBACK_KEY:
        raise HTTPException(status_code=503, detail="CRM_CALLBACK_KEY chưa được cấu hình.")
    supplied = request.headers.get("authorization", "")
    if not hmac.compare_digest(supplied.encode(), f"Bearer {settings.CRM_CALLBACK_KEY}".encode()):
        raise HTTPException(status_code=401, detail="Integration key không hợp lệ.")
    booking = db.query(Booking).filter(
        Booking.id == update.booking_id,
        Booking.booking_code == update.booking_code.strip().upper(),
    ).with_for_update().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng CMS.")
    if booking.crm_booking_id and booking.crm_booking_id != update.crm_booking_id:
        raise HTTPException(status_code=409, detail="Đơn hàng không khớp với liên kết CRM.")
    if (booking.status, booking.payment_status) != (update.expected_status, update.expected_payment_status):
        if (booking.status, booking.payment_status) != (update.status, update.payment_status):
            raise HTTPException(status_code=409, detail="Đơn đã thay đổi trên CMS. Vui lòng đồng bộ lại trước khi duyệt.")
        return {"booking_id": booking.id, "booking_code": booking.booking_code,
                "status": booking.status, "payment_status": booking.payment_status}
    booking.crm_booking_id = update.crm_booking_id
    updated = _apply_booking_update(
        booking.id, BookingUpdate(status=update.status, payment_status=update.payment_status),
        background_tasks, db,
    )
    return {"booking_id": updated.id, "booking_code": updated.booking_code,
            "status": updated.status, "payment_status": updated.payment_status}

@router.post("/", response_model=BookingResponse)
def make_booking(
    request: Request,
    booking_in: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    booking_rate_limiter.check_rate_limit(request)
    if booking_in.departure_date < date.today():
        raise HTTPException(status_code=400, detail="Ngày khởi hành không thể ở trong quá khứ.")
        
    db_booking = create_booking(db, booking=booking_in)
    
    background_tasks.add_task(
        send_booking_email,
        to_email=db_booking.email,
        tour_title=db_booking.tour_title,
        full_name=db_booking.full_name,
        departure_date=str(db_booking.departure_date),
        guests_count=db_booking.guests_count,
        booking_id=db_booking.id,
        secure_token=db_booking.secure_token
    )
    background_tasks.add_task(sync_booking_to_crm, db_booking.id)
    
    return db_booking


@router.get("/", response_model=List[BookingResponse])
def read_bookings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    return get_bookings(db, skip=skip, limit=limit)

@router.get("/my-bookings", response_model=List[BookingResponse])
def read_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.booking import Booking
    return db.query(Booking).filter(Booking.email == current_user.email).order_by(Booking.created_at.desc()).all()

@router.get("/{booking_id}", response_model=BookingResponse)
def read_booking(
    booking_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    db_booking = get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if current_user:
        if not current_user.is_admin and db_booking.email != current_user.email:
            raise HTTPException(status_code=403, detail="Permission denied")
    else:
        if not token or token != db_booking.secure_token:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập thông tin đơn hàng này. Vui lòng đăng nhập hoặc cung cấp mã xác thực hợp lệ."
            )
            
    return db_booking

@router.put("/{booking_id}", response_model=BookingResponse)
def edit_booking(
    booking_id: int,
    booking_in: BookingUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    return _apply_booking_update(booking_id, booking_in, background_tasks, db)


def _apply_booking_update(
    booking_id: int,
    booking_in: BookingUpdate,
    background_tasks: BackgroundTasks,
    db: Session,
):
    db_booking = get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    requested = booking_in.model_dump(exclude_unset=True)
    if requested.get("payment_status") == "paid" and requested.get("status", db_booking.status) != "confirmed":
        raise HTTPException(status_code=400, detail="Cần xác nhận đơn trước khi đánh dấu đã thanh toán.")

    old_status = db_booking.status
    db_booking = update_booking(db, db_booking=db_booking, booking=booking_in)
    background_tasks.add_task(sync_booking_to_crm, db_booking.id)

    # Send email on status change
    if db_booking.status != old_status:
        if db_booking.status == "confirmed" and old_status == "pending":
            background_tasks.add_task(
                send_booking_confirmed_email,
                to_email=db_booking.email,
                full_name=db_booking.full_name,
                tour_title=db_booking.tour_title,
                departure_date=str(db_booking.departure_date),
                guests_count=db_booking.guests_count,
                total_amount=db_booking.total_amount,
                booking_id=db_booking.id,
                online_payment_enabled=online_payments_enabled(db),
                secure_token=db_booking.secure_token
            )
        elif db_booking.status == "cancelled" and old_status != "cancelled":
            background_tasks.add_task(
                send_booking_cancelled_email,
                to_email=db_booking.email,
                full_name=db_booking.full_name,
                tour_title=db_booking.tour_title,
                departure_date=str(db_booking.departure_date),
                reason="Đơn hàng bị hủy bởi quản trị viên"
            )

    return db_booking

@router.post("/{booking_id}/sync-crm", response_model=BookingResponse)
def retry_crm_sync(
    booking_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    db_booking = get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    db_booking.crm_sync_status = "queued"
    db_booking.crm_last_error = None
    db.commit()
    db.refresh(db_booking)
    background_tasks.add_task(sync_booking_to_crm, booking_id)
    return db_booking

@router.patch("/{booking_id}", response_model=BookingResponse)
def patch_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    background_tasks: BackgroundTasks,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Partial update booking (for payment redirect status updates with security checks)"""
    db_booking = get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_status = db_booking.status

    # Access control
    if current_user:
        if not current_user.is_admin and db_booking.email != current_user.email:
            raise HTTPException(status_code=403, detail="Permission denied")
        if not current_user.is_admin:
            update_data = booking_update.model_dump(exclude_unset=True)
            if set(update_data) != {"status"} or update_data.get("status") != "cancelled":
                raise HTTPException(status_code=403, detail="Khách hàng chỉ được phép hủy đơn chưa thanh toán.")
            if db_booking.status != "pending" or db_booking.payment_status != "unpaid":
                raise HTTPException(status_code=400, detail="Chỉ đơn chờ xử lý và chưa thanh toán mới được hủy.")
    else:
        if not token or token != db_booking.secure_token:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền chỉnh sửa đơn hàng này. Vui lòng đăng nhập hoặc cung cấp mã xác thực hợp lệ."
            )

        # Anonymous users can only change status to "cancelled" on a pending and unpaid booking
        update_data = booking_update.model_dump(exclude_unset=True)
        updated_keys = set(update_data.keys())
        if not updated_keys.issubset({"status"}) or update_data.get("status") != "cancelled":
            raise HTTPException(
                status_code=403,
                detail="Không có quyền chỉnh sửa thông tin. Khách vãng lai chỉ được phép hủy đơn hàng chưa thanh toán."
            )
        if db_booking.status != "pending" or db_booking.payment_status != "unpaid":
            raise HTTPException(
                status_code=400,
                detail="Chỉ đơn hàng ở trạng thái chờ xử lý và chưa thanh toán mới có thể hủy."
            )

    db_booking = update_booking(db, db_booking=db_booking, booking=booking_update)
    background_tasks.add_task(sync_booking_to_crm, db_booking.id)

    # Send cancellation email if customer/anonymous cancelled the booking
    if db_booking.status == "cancelled" and old_status != "cancelled":
        background_tasks.add_task(
            send_booking_cancelled_email,
            to_email=db_booking.email,
            full_name=db_booking.full_name,
            tour_title=db_booking.tour_title,
            departure_date=str(db_booking.departure_date),
            reason="Đơn hàng bị hủy bởi khách hàng"
        )

    return db_booking

@router.post("/{booking_id}/submit-payment", response_model=BookingResponse)
def submit_payment_proof(
    booking_id: int,
    payment_data: PaymentProofSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_booking = get_booking(db, booking_id=booking_id)
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Thanh toán được đối soát thủ công bởi quản trị viên.")
        
    db_booking.payment_proof = payment_data.payment_proof
    db_booking.payment_ref = payment_data.payment_ref
    db_booking.payment_status = "pending"
    
    db.commit()
    db.refresh(db_booking)
    return db_booking

@router.post("/lookup", response_model=BookingResponse)
def lookup_booking(
    request: Request,
    lookup_in: BookingLookup,
    db: Session = Depends(get_db)
):
    from app.models.booking import Booking
    
    booking_lookup_rate_limiter.check_rate_limit(request)
    query = db.query(Booking)
    booking = query.filter(
        Booking.booking_code == lookup_in.booking_code.strip().upper()
        if lookup_in.booking_code else Booking.id == lookup_in.booking_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng khớp với thông tin tra cứu.")
        
    email_or_phone = lookup_in.email_or_phone.strip().lower()
    booking_email = booking.email.strip().lower()
    booking_phone = booking.phone.strip()
    
    if booking_email != email_or_phone and booking_phone != email_or_phone:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng khớp với thông tin tra cứu.")
        
    return booking

