import hashlib
import hmac
import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.booking import Booking
from app.models.tour import Tour, TourSchedule


def _booking_payload(booking: Booking) -> dict:
    schedule = None
    if booking.tour_id:
        schedule = (
            booking._sa_instance_state.session.query(TourSchedule)
            .filter(
                TourSchedule.tour_id == booking.tour_id,
                TourSchedule.departure_date == booking.departure_date,
            )
            .first()
        )
    return {
        "event": "booking.upserted",
        "event_id": f"booking-{booking.id}-{int(datetime.now(timezone.utc).timestamp())}",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "booking_id": booking.id,
            "booking_code": booking.booking_code,
            "tour_id": booking.tour_id,
            "tour_code": booking.tour.tour_code if booking.tour else None,
            "departure_id": schedule.id if schedule else None,
            "departure_code": schedule.departure_code if schedule else None,
            "departure_date": booking.departure_date.isoformat(),
            "customer": {
                "full_name": booking.full_name,
                "email": booking.email,
                "phone": booking.phone,
            },
            "passenger_counts": {
                "adults": booking.adults_count,
                "children": booking.children_count,
                "infants": booking.infants_count,
                "total": booking.guests_count,
            },
            "booking_status": booking.status,
            "payment_status": booking.payment_status,
            "quoted_total": booking.total_amount,
            "discount_code": booking.discount_code,
            "discount_amount": booking.discount_amount,
            "notes": booking.notes,
            "source": "website",
        },
    }


def sync_booking_to_crm(booking_id: int) -> None:
    """Best-effort CRM sync used by background tasks and manual retry."""
    db = SessionLocal()
    try:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return
        if not settings.CRM_API_URL:
            booking.crm_sync_status = "not_configured"
            booking.crm_last_error = "CRM_API_URL chưa được cấu hình"
            db.commit()
            return

        payload = _booking_payload(booking)
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(
            settings.CRM_WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256
        ).hexdigest() if settings.CRM_WEBHOOK_SECRET else ""
        url = urljoin(settings.CRM_API_URL.rstrip("/") + "/", settings.CRM_BOOKING_ENDPOINT.lstrip("/"))
        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "X-Event-Id": payload["event_id"],
            "X-Webhook-Signature": signature,
        }
        if settings.CRM_API_KEY:
            headers["Authorization"] = f"Bearer {settings.CRM_API_KEY}"

        booking.crm_sync_status = "syncing"
        booking.crm_last_error = None
        db.commit()
        request = Request(url, data=body, headers=headers, method="POST")
        with urlopen(request, timeout=10) as response:
            response_body = response.read().decode("utf-8")
            result = json.loads(response_body) if response_body else {}
        booking.crm_sync_status = "synced"
        booking.crm_customer_id = result.get("customer_id") or booking.crm_customer_id
        booking.crm_booking_id = result.get("booking_id") or result.get("crm_booking_id") or booking.crm_booking_id
        booking.crm_synced_at = datetime.now(timezone.utc)
        booking.crm_last_error = None
        db.commit()
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        db.rollback()
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if booking:
            booking.crm_sync_status = "failed"
            booking.crm_last_error = str(exc)[:1000]
            db.commit()
    finally:
        db.close()


def _tour_payload(tour: Tour) -> dict:
    return {
        "event": "tour.upserted",
        "event_id": f"tour-{tour.id}-{int(datetime.now(timezone.utc).timestamp())}",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "tour_id": tour.id,
            "tour_code": tour.tour_code,
            "slug": tour.slug,
            "name": tour.title,
            "name_en": tour.title_en,
            "destination": tour.location,
            "description": tour.description,
            "duration": tour.duration,
            "price": {
                "adult": tour.price_daily or tour.price,
                "child": tour.price_child or 0,
                "infant": tour.price_infant or 0,
                "promotion": tour.price_promo_daily or 0,
                "min_group_size": tour.min_group_size or 1,
                "accommodation_options": tour.accommodation_prices or [],
            },
            "price_includes": tour.price_includes,
            "price_excludes": tour.price_excludes,
            "cancellation_policy": tour.cancellation_policy,
            "payment_terms": tour.payment_terms,
            "important_note": tour.important_note,
            "is_active": tour.is_active,
            "is_international": tour.is_international,
            "document_url": tour.document_url,
            "images": [image.url for image in tour.images],
            "itinerary": [
                {"day": item.day, "title": item.title, "description": item.content, "meals": item.meals, "overnight": item.overnight}
                for item in sorted(tour.itinerary, key=lambda value: (value.sort_order or value.day, value.day))
            ],
            "departures": [
                {
                    "id": schedule.id,
                    "code": schedule.departure_code,
                    "date": schedule.departure_date.isoformat(),
                    "max_capacity": schedule.max_capacity,
                    "booked_seats": schedule.booked_seats,
                    "status": schedule.status,
                }
                for schedule in tour.schedules
            ],
            "source": "website_cms",
        },
    }


def sync_tour_to_crm(tour_id: int) -> dict:
    db = SessionLocal()
    try:
        tour = db.query(Tour).filter(Tour.id == tour_id).first()
        if not tour:
            return {"tour_id": tour_id, "status": "not_found"}
        if not settings.CRM_API_URL:
            return {"tour_id": tour_id, "tour_code": tour.tour_code, "status": "not_configured", "error": "CRM_API_URL chưa được cấu hình"}
        payload = _tour_payload(tour)
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(settings.CRM_WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest() if settings.CRM_WEBHOOK_SECRET else ""
        headers = {"Content-Type": "application/json; charset=utf-8", "X-Event-Id": payload["event_id"], "X-Webhook-Signature": signature}
        if settings.CRM_API_KEY:
            headers["Authorization"] = f"Bearer {settings.CRM_API_KEY}"
        url = urljoin(settings.CRM_API_URL.rstrip("/") + "/", settings.CRM_TOUR_ENDPOINT.lstrip("/"))
        with urlopen(Request(url, data=body, headers=headers, method="POST"), timeout=15) as response:
            response_body = response.read().decode("utf-8")
            result = json.loads(response_body) if response_body else {}
        tour.crm_tour_id = result.get("tour_id") or result.get("crm_tour_id") or tour.crm_tour_id
        db.commit()
        return {"tour_id": tour.id, "tour_code": tour.tour_code, "crm_tour_id": tour.crm_tour_id, "status": "synced"}
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        return {"tour_id": tour_id, "status": "failed", "error": str(exc)[:1000]}
    finally:
        db.close()
