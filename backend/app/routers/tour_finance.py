from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.booking import Booking
from app.models.tour import Tour, TourSchedule
from app.models.user import User
from app.routers.auth import get_current_user, ensure_admin_roles
from app.schemas.tour_finance import TourFinanceConfig
from app.services.tour_finance import duration_days, recommended_price, summarize_departure

router = APIRouter(prefix="/tour-operations", tags=["Tour finance"])


def finance_admin(current_user: User = Depends(get_current_user)):
    ensure_admin_roles(current_user, {"super_admin", "manager"})
    return current_user


@router.get("/finance-config")
def read_configs(db: Session = Depends(get_db), current_user: User = Depends(finance_admin)):
    tours = db.query(Tour).order_by(Tour.id.desc()).all()
    return {"tours": [{"id": tour.id, "title": tour.title, "tour_code": tour.tour_code, "price": tour.price,
                       "configured": bool(tour.financial_config), "config": TourFinanceConfig(**(tour.financial_config or {})).model_dump(),
                       "preview": recommended_price(TourFinanceConfig(**(tour.financial_config or {})), duration_days(tour.duration))} for tour in tours]}


@router.put("/finance-config/{tour_id}")
def save_config(tour_id: int, config: TourFinanceConfig, db: Session = Depends(get_db), current_user: User = Depends(finance_admin)):
    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour")
    tour.financial_config = config.model_dump()
    db.commit()
    return {"config": tour.financial_config, "preview": recommended_price(config, duration_days(tour.duration))}


@router.get("/finance-report")
def finance_report(from_date: Optional[date] = Query(None, alias="from"), to_date: Optional[date] = Query(None, alias="to"),
                   tour_id: Optional[int] = Query(None), db: Session = Depends(get_db), current_user: User = Depends(finance_admin)):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải trước hoặc bằng ngày kết thúc")
    booking_query = db.query(Booking).filter(Booking.status != "cancelled", Booking.tour_id.isnot(None))
    schedule_query = db.query(TourSchedule).filter(TourSchedule.status != "cancelled")
    if from_date:
        booking_query = booking_query.filter(Booking.departure_date >= from_date)
        schedule_query = schedule_query.filter(TourSchedule.departure_date >= from_date)
    if to_date:
        booking_query = booking_query.filter(Booking.departure_date <= to_date)
        schedule_query = schedule_query.filter(TourSchedule.departure_date <= to_date)
    if tour_id:
        booking_query = booking_query.filter(Booking.tour_id == tour_id)
        schedule_query = schedule_query.filter(TourSchedule.tour_id == tour_id)
    groups = defaultdict(list)
    for booking in booking_query.all():
        groups[(booking.tour_id, booking.departure_date)].append(booking)
    schedules = {(schedule.tour_id, schedule.departure_date): schedule for schedule in schedule_query.all()}
    keys = set(groups) | set(schedules)
    tours = {tour.id: tour for tour in db.query(Tour).filter(Tour.id.in_({key[0] for key in keys})).all()}
    rows = []
    for key in sorted(keys, key=lambda item: (item[1], item[0]), reverse=True):
        tour = tours.get(key[0])
        if not tour:
            continue
        schedule = schedules.get(key)
        config = TourFinanceConfig(**(tour.financial_config or {}))
        figures = summarize_departure(config, groups.get(key, []), duration_days(tour.duration), schedule.actual_cost if schedule else None)
        rows.append({"id": f"{key[0]}-{key[1]}", "code": schedule.departure_code if schedule else f"{tour.tour_code} · {key[1]:%d/%m/%Y}",
                     "tour": {"id": tour.id, "title": tour.title}, "startDate": key[1],
                     "status": "Đang mở" if not schedule or schedule.status == "active" else "Đã khóa", "configured": bool(tour.financial_config), **figures})
    totals = {field: round(sum(row[field] for row in rows), 2) for field in ("revenue", "cost", "commission", "profit")}
    return {"rows": rows, "totals": totals}
