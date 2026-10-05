from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.country import get_country, get_country_by_slug, get_countries, create_country, update_country, delete_country
from app.schemas.country import CountryResponse, CountryCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/countries", tags=["Countries Management"])

@router.get("/", response_model=List[CountryResponse])
def read_countries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_countries(db, skip=skip, limit=limit)

@router.get("/{country_id}", response_model=CountryResponse)
def read_country(country_id: int, db: Session = Depends(get_db)):
    db_country = get_country(db, country_id=country_id)
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    return db_country

@router.post("/", response_model=CountryResponse)
def add_country(
    country_in: CountryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_country_by_slug(db, slug=country_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Country slug already exists")
    return create_country(db, country=country_in)

@router.put("/{country_id}", response_model=CountryResponse)
def edit_country(
    country_id: int,
    country_in: CountryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_country = get_country(db, country_id=country_id)
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    return update_country(db, db_country=db_country, country_in=country_in)

@router.delete("/{country_id}")
def remove_country(
    country_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_country(db, country_id=country_id)
    if not success:
        raise HTTPException(status_code=404, detail="Country not found")
    return {"detail": "Country deleted successfully"}
