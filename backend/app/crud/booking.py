from sqlalchemy.orm import Session
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingUpdate
from datetime import datetime
from fastapi import HTTPException

def get_booking(db: Session, booking_id: int):
    return db.query(Booking).filter(Booking.id == booking_id).first()

def get_bookings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Booking).order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()

def create_booking(db: Session, booking: BookingCreate):
    from app.models.tour import Tour, TourSchedule
    from app.models.discount import DiscountCode
    from datetime import datetime, timezone

    # 1. Tour và giá luôn được xác thực/tính ở server.
    tour = db.query(Tour).filter(Tour.id == booking.tour_id).first() if booking.tour_id else None
    if not tour or not tour.is_active:
        raise HTTPException(status_code=400, detail="Tour không tồn tại hoặc đã ngừng nhận khách.")

    guests_count = booking.adults_count + booking.children_count + booking.infants_count
    if guests_count != booking.guests_count:
        raise HTTPException(status_code=400, detail="Tổng số khách không khớp với chi tiết hành khách.")
    adult_price = tour.price
    if (tour.is_daily or tour.recurring_days) and tour.price_daily:
        adult_price = tour.price_promo_daily or tour.price_daily
    elif tour.is_promo and tour.price_promo_daily:
        adult_price = tour.price_promo_daily
    for item in tour.custom_departures or []:
        if isinstance(item, dict) and str(item.get("date")) == booking.departure_date.isoformat():
            adult_price = item.get("promo_price") or item.get("price") or adult_price
            break

    subtotal = (
        adult_price * booking.adults_count
        + tour.price_child * booking.children_count
        + tour.price_infant * booking.infants_count
    )

    # 2. Kiểm tra lịch trình (TourSchedule) và số chỗ còn trống (capacity)
    if tour:
        schedule = db.query(TourSchedule).filter(
            TourSchedule.tour_id == booking.tour_id,
            TourSchedule.departure_date == booking.departure_date
        ).with_for_update().first()

        if schedule:
            if schedule.status != "active":
                raise HTTPException(
                    status_code=400, 
                    detail="Ngày khởi hành này hiện đã đóng hoặc không nhận thêm khách."
                )
            if schedule.booked_seats + booking.guests_count > schedule.max_capacity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Số lượng chỗ trống không đủ. Chỉ còn {schedule.max_capacity - schedule.booked_seats} chỗ trống."
                )
            # Tạm tính chỗ
            schedule.booked_seats += booking.guests_count
        elif tour.schedules:
            raise HTTPException(status_code=400, detail="Ngày khởi hành này chưa được mở bán.")
        elif not tour.is_daily:
            custom_dates = {
                str(item.get("date")) if isinstance(item, dict) else str(item)
                for item in tour.custom_departures or []
            }
            recurring_day = (booking.departure_date.weekday() + 1) % 7
            if (custom_dates or tour.recurring_days) and (
                booking.departure_date.isoformat() not in custom_dates
                and recurring_day not in (tour.recurring_days or [])
            ):
                raise HTTPException(status_code=400, detail="Ngày khởi hành này chưa được mở bán.")

    discount_amount = 0.0
    applied_code = None

    # 3. Xử lý mã giảm giá nếu có
    if booking.discount_code:
        applied_code = booking.discount_code.upper()
        discount = db.query(DiscountCode).filter(DiscountCode.code == applied_code).first()
        if not discount or not discount.is_active:
            raise HTTPException(status_code=400, detail="Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.")
        if discount and discount.is_active:
            # Kiểm tra ngày hết hạn
            is_expired = False
            if discount.expiry_date:
                now_tz = datetime.now(timezone.utc)
                exp_date = discount.expiry_date
                # Đảm bảo so sánh cùng timezone
                if exp_date.tzinfo is None:
                    exp_date = exp_date.replace(tzinfo=timezone.utc)
                if now_tz > exp_date:
                    is_expired = True

            if not is_expired and subtotal >= discount.min_value:
                if discount.discount_type == "percentage":
                    discount_amount = subtotal * (discount.value / 100.0)
                elif discount.discount_type == "fixed":
                    discount_amount = discount.value

                discount_amount = min(discount_amount, subtotal)
            else:
                raise HTTPException(status_code=400, detail="Mã giảm giá đã hết hạn hoặc chưa đạt giá trị đơn tối thiểu.")

    total_amount = subtotal - discount_amount

    db_booking = Booking(
        tour_id=booking.tour_id,
        tour_title=tour.title,
        full_name=booking.full_name,
        email=booking.email,
        phone=booking.phone,
        departure_date=booking.departure_date,
        guests_count=booking.guests_count,
        adults_count=booking.adults_count,
        children_count=booking.children_count,
        infants_count=booking.infants_count,
        notes=booking.notes,
        payment_status="unpaid",
        payment_proof=None,
        payment_ref=None,
        total_amount=total_amount,
        discount_code=applied_code,
        discount_amount=discount_amount
    )
    db.add(db_booking)
    db.flush()
    db_booking.booking_code = f"NST-{datetime.utcnow():%Y%m%d}-{db_booking.id:06d}"
    db.commit()
    db.refresh(db_booking)
    return db_booking

def update_booking(db: Session, db_booking: Booking, booking: BookingUpdate):
    from app.models.tour import TourSchedule
    db_booking = db.query(Booking).filter(Booking.id == db_booking.id).with_for_update().populate_existing().one()
    old_status = db_booking.status
    old_guests_count = db_booking.guests_count
    
    update_data = booking.model_dump(exclude_unset=True)
    if any(update_data.get(field) is None for field in ("status", "payment_status", "guests_count", "departure_date") if field in update_data):
        raise HTTPException(status_code=400, detail="Trạng thái, số khách và ngày khởi hành không được để trống.")
    
    # 1. Nếu thay đổi số khách hoặc đổi trạng thái hủy/kích hoạt lại
    new_status = update_data.get("status", old_status)
    new_guests = update_data.get("guests_count", old_guests_count)
    new_payment_status = update_data.get("payment_status", db_booking.payment_status)
    if new_payment_status == "paid" and new_status != "confirmed":
        raise HTTPException(status_code=400, detail="Cần xác nhận đơn trước khi đánh dấu đã thanh toán.")
    if db_booking.payment_status == "paid" and new_payment_status != "paid":
        raise HTTPException(status_code=400, detail="Đơn đã thanh toán cần xử lý hoàn tiền riêng, không được đặt lại trạng thái thanh toán.")
    counts = [update_data.get(field, getattr(db_booking, field)) for field in ("adults_count", "children_count", "infants_count")]
    if any(count is None for count in counts) or new_guests != sum(counts):
        raise HTTPException(status_code=400, detail="Tổng số khách không khớp với chi tiết hành khách.")
    if update_data.get("departure_date", db_booking.departure_date) != db_booking.departure_date:
        raise HTTPException(status_code=400, detail="Đổi ngày khởi hành cần xử lý chuyển chỗ và báo giá riêng.")
    
    if db_booking.tour_id:
        schedule = db.query(TourSchedule).filter(
            TourSchedule.tour_id == db_booking.tour_id,
            TourSchedule.departure_date == db_booking.departure_date
        ).with_for_update().first()
        
        if schedule:
            # Trường hợp 1: Huỷ đơn hàng -> Trả lại chỗ
            if new_status == "cancelled" and old_status != "cancelled":
                schedule.booked_seats = max(0, schedule.booked_seats - old_guests_count)
            # Trường hợp 2: Khôi phục đơn hàng đã huỷ -> Kiểm tra lại chỗ
            elif old_status == "cancelled" and new_status != "cancelled":
                if schedule.status != "active":
                    raise HTTPException(status_code=400, detail="Ngày khởi hành đã đóng, không thể khôi phục đơn.")
                if schedule.booked_seats + new_guests > schedule.max_capacity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Không thể khôi phục đơn hàng. Chỉ còn {schedule.max_capacity - schedule.booked_seats} chỗ trống."
                    )
                schedule.booked_seats += new_guests
            # Trường hợp 3: Đơn hàng hoạt động và thay đổi số khách
            elif old_status != "cancelled" and new_status != "cancelled" and new_guests != old_guests_count:
                net_change = new_guests - old_guests_count
                if schedule.booked_seats + net_change > schedule.max_capacity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Không thể cập nhật số lượng khách. Chỉ còn {schedule.max_capacity - schedule.booked_seats} chỗ trống."
                    )
                schedule.booked_seats += net_change

    # Cập nhật thông tin booking
    for key, value in update_data.items():
        setattr(db_booking, key, value)

    # Đồng bộ hóa giao dịch thanh toán nếu payment_status được cập nhật thành paid
    if update_data.get("payment_status") == "paid":
        from app.models.payment_transaction import PaymentTransaction
        pending_transactions = db.query(PaymentTransaction).filter(
            PaymentTransaction.booking_id == db_booking.id,
            PaymentTransaction.status == "pending"
        ).all()
        for trans in pending_transactions:
            trans.status = "completed"
            trans.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(db_booking)
    return db_booking
