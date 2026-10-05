from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.province import get_province, get_provinces, create_province, update_province, delete_province
from app.schemas.province import ProvinceResponse, ProvinceCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/provinces", tags=["Provinces Management"])

@router.get("/", response_model=List[ProvinceResponse])
def read_provinces(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_provinces(db, skip=skip, limit=limit)

@router.get("/{province_id}", response_model=ProvinceResponse)
def read_province(province_id: int, db: Session = Depends(get_db)):
    db_province = get_province(db, province_id=province_id)
    if not db_province:
        raise HTTPException(status_code=404, detail="Province not found")
    return db_province

@router.post("/", response_model=ProvinceResponse)
def add_province(
    province_in: ProvinceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_province(db, province=province_in)

@router.put("/{province_id}", response_model=ProvinceResponse)
def edit_province(
    province_id: int,
    province_in: ProvinceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_province = get_province(db, province_id=province_id)
    if not db_province:
        raise HTTPException(status_code=404, detail="Province not found")
    return update_province(db, db_province=db_province, province_in=province_in)

@router.delete("/{province_id}")
def remove_province(
    province_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_province(db, province_id=province_id)
    if not success:
        raise HTTPException(status_code=404, detail="Province not found")
    return {"detail": "Province deleted successfully"}
