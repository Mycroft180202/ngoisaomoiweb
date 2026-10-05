from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Any
from app.core.database import get_db
from app.crud.setting import get_setting, get_all_settings, update_setting, delete_setting
from app.schemas.setting import SystemSettingResponse, SystemSettingCreate
from app.routers.auth import get_current_user, require_super_admin
from app.models.user import User
import json

router = APIRouter(prefix="/settings", tags=["System Settings"])

PUBLIC_SETTING_KEYS = {
    "cms_site_config",
    "config_general",
    "cms_branding",
    "cms_hero_section",
    "cms_maintenance",
    "cms_ui_version",
}

@router.get("/public/site-config")
def read_public_site_config(db: Session = Depends(get_db)):
    """Return only settings that are safe and necessary for the public website."""
    result = {}
    for item in get_all_settings(db):
        if item.key not in PUBLIC_SETTING_KEYS:
            continue
        value = item.value
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (TypeError, json.JSONDecodeError):
                pass
        result[item.key] = value
    return result

@router.put("/{key}/json", response_model=SystemSettingResponse)
def save_setting_json(
    key: str,
    value: Any = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return update_setting(db, key=key, value=value)

@router.get("/", response_model=List[SystemSettingResponse])
def read_settings(db: Session = Depends(get_db)):
    return get_all_settings(db)

@router.get("/{key}", response_model=SystemSettingResponse)
def read_setting(key: str, db: Session = Depends(get_db)):
    db_setting = get_setting(db, key=key)
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return db_setting

@router.put("/{key}", response_model=SystemSettingResponse)
def save_setting(
    key: str,
    value: Any,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return update_setting(db, key=key, value=value)

@router.delete("/{key}")
def remove_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    success = delete_setting(db, key=key)
    if not success:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {"detail": "Setting deleted successfully"}
