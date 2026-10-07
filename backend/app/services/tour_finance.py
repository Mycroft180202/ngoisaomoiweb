import re

from app.schemas.tour_finance import TourFinanceConfig


def duration_days(duration: str) -> int:
    match = re.search(r"\d+", duration or "")
    return max(1, int(match.group()) if match else 1)


def calculate_commission(config: TourFinanceConfig, booking, days: int) -> float:
    if not booking.partner_code:
        return 0.0
    guests = booking.adults_count
    if config.commission_children:
        guests += booking.children_count
    if config.commission_infants:
        guests += booking.infants_count
    if config.commission_type == "percentage":
        return round((booking.total_amount or 0) * config.commission_value / 100, 2)
    if config.commission_type == "per_booking":
        return config.commission_value
    return config.commission_value * guests * (days if config.commission_type == "per_day" else 1)


def recommended_price(config: TourFinanceConfig, days: int) -> dict:
    tax = config.net_cost_adult * config.tax_percent / 100
    profit = config.net_cost_adult * config.profit_percent / 100
    base = config.net_cost_adult + tax + profit
    if config.commission_type == "percentage":
        price = base / (1 - config.commission_value / 100)
        commission = price - base
    elif config.commission_type == "per_booking":
        # Booking commission/fixed expenses cannot be allocated without a guest count.
        price, commission = base, 0
    else:
        commission = config.commission_value * (days if config.commission_type == "per_day" else 1)
        price = base + commission
    return {"net": config.net_cost_adult, "tax": round(tax, 2), "target_profit": round(profit, 2), "commission": round(commission, 2), "adult_price": round(price), "days": days}


def summarize_departure(config: TourFinanceConfig, bookings: list, days: int, actual_cost=None) -> dict:
    recognized = [booking for booking in bookings if booking.status == "confirmed" and (config.revenue_basis != "paid" or booking.payment_status == "paid")]
    revenue = sum(booking.total_amount or 0 for booking in recognized)
    commission = sum(calculate_commission(config, booking, days) for booking in recognized)
    net = sum(booking.adults_count * config.net_cost_adult + booking.children_count * config.net_cost_child + booking.infants_count * config.net_cost_infant for booking in recognized)
    cost = actual_cost if actual_cost is not None else net * (1 + config.tax_percent / 100) + config.fixed_cost
    return {"revenue": round(revenue, 2), "cost": round(cost, 2), "commission": round(commission, 2), "profit": round(revenue - cost - commission, 2), "guests": sum(booking.guests_count for booking in recognized), "cost_basis": "actual" if actual_cost is not None else "estimated"}
