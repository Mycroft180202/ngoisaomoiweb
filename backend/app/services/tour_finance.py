import re

from app.schemas.tour_finance import TourFinanceConfig


def duration_days(duration: str) -> int:
    match = re.search(r"\d+", duration or "")
    return max(1, int(match.group()) if match else 1)


def calculate_commission(config: TourFinanceConfig, booking, days: int) -> float:
    if not booking.partner_code:
        return 0.0
    code = booking.partner_code.strip().upper()
    rule = next((rule for rule in config.partner_overrides if rule.partner_code == code), config)
    return commission_amount(rule, booking, days)


def commission_amount(config, booking, days: int) -> float:
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
    rate = 0
    fixed = 0
    for rule in (config, config.own_commission):
        if rule.commission_type == "percentage":
            rate += rule.commission_value / 100
        elif rule.commission_type != "per_booking":
            fixed += rule.commission_value * (days if rule.commission_type == "per_day" else 1)
    price = (base + fixed) / (1 - rate)
    commission = price - base
    return {"net": config.net_cost_adult, "tax": round(tax, 2), "target_profit": round(profit, 2), "commission": round(commission, 2), "adult_price": round(price), "days": days}


def summarize_departure(config: TourFinanceConfig, bookings: list, days: int, actual_cost=None) -> dict:
    recognized = [booking for booking in bookings if booking.status == "confirmed" and (config.revenue_basis != "paid" or booking.payment_status == "paid")]
    revenue = sum(booking.total_amount or 0 for booking in recognized)
    partner_commission = sum(calculate_commission(config, booking, days) for booking in recognized)
    own_commission = sum(commission_amount(config.own_commission, booking, days) for booking in recognized)
    commission = partner_commission + own_commission
    net = sum(booking.adults_count * config.net_cost_adult + booking.children_count * config.net_cost_child + booking.infants_count * config.net_cost_infant for booking in recognized)
    cost = actual_cost if actual_cost is not None else net * (1 + config.tax_percent / 100) + config.fixed_cost
    return {"partner_commission": round(partner_commission, 2), "own_commission": round(own_commission, 2), "revenue": round(revenue, 2), "cost": round(cost, 2), "commission": round(commission, 2), "profit": round(revenue - cost - commission, 2), "guests": sum(booking.guests_count for booking in recognized), "cost_basis": "actual" if actual_cost is not None else "estimated"}
