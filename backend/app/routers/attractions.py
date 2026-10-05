from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.attraction import get_attraction, get_attractions, create_attraction, update_attraction, delete_attraction
from app.schemas.attraction import AttractionResponse, AttractionCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/attractions", tags=["Attractions Management"])

@router.get("/", response_model=List[AttractionResponse])
def read_attractions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_attractions(db, skip=skip, limit=limit)

@router.get("/{attraction_id}", response_model=AttractionResponse)
def read_attraction(attraction_id: int, db: Session = Depends(get_db)):
    db_attraction = get_attraction(db, attraction_id=attraction_id)
    if not db_attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return db_attraction

@router.post("/", response_model=AttractionResponse)
def add_attraction(
    attraction_in: AttractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_attraction(db, attraction=attraction_in)

@router.put("/{attraction_id}", response_model=AttractionResponse)
def edit_attraction(
    attraction_id: int,
    attraction_in: AttractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_attraction = get_attraction(db, attraction_id=attraction_id)
    if not db_attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return update_attraction(db, db_attraction=db_attraction, attraction_in=attraction_in)

@router.delete("/{attraction_id}")
def remove_attraction(
    attraction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_attraction(db, attraction_id=attraction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return {"detail": "Attraction deleted successfully"}
