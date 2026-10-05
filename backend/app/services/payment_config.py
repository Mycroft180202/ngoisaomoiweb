import json

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.setting import get_setting


def online_payments_enabled(db: Session) -> bool:
    site_setting = get_setting(db, key="cms_site_config")
    if not site_setting:
        return settings.ONLINE_PAYMENTS_ENABLED
    value = site_setting.value
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return settings.ONLINE_PAYMENTS_ENABLED
    if not isinstance(value, dict):
        return settings.ONLINE_PAYMENTS_ENABLED
    payment = value.get("payment")
    return bool(payment.get("online_enabled", False)) if isinstance(payment, dict) else False
