from sqlalchemy.orm import Session
from app.models.setting import SystemSetting
from typing import Any

def get_setting(db: Session, key: str):
    return db.query(SystemSetting).filter(SystemSetting.key == key).first()

def get_all_settings(db: Session):
    return db.query(SystemSetting).all()

def update_setting(db: Session, key: str, value: Any):
    db_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if db_setting:
        db_setting.value = value
    else:
        db_setting = SystemSetting(key=key, value=value)
        db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

def delete_setting(db: Session, key: str):
    db_setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if db_setting:
        db.delete(db_setting)
        db.commit()
        return True
    return False
