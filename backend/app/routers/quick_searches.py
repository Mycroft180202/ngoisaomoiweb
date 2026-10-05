from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.quick_search import get_quick_search, get_quick_searches, create_quick_search, update_quick_search, delete_quick_search
from app.schemas.quick_search import QuickSearchResponse, QuickSearchCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/quick-searches", tags=["Quick Search Management"])

@router.get("/", response_model=List[QuickSearchResponse])
def read_quick_searches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_quick_searches(db, skip=skip, limit=limit)

@router.get("/{quick_search_id}", response_model=QuickSearchResponse)
def read_quick_search(quick_search_id: int, db: Session = Depends(get_db)):
    db_quick = get_quick_search(db, quick_search_id=quick_search_id)
    if not db_quick:
        raise HTTPException(status_code=404, detail="Quick search keyword not found")
    return db_quick

@router.post("/", response_model=QuickSearchResponse)
def add_quick_search(
    quick_search_in: QuickSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_quick_search(db, quick_search=quick_search_in)

@router.put("/{quick_search_id}", response_model=QuickSearchResponse)
def edit_quick_search(
    quick_search_id: int,
    quick_search_in: QuickSearchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_quick = get_quick_search(db, quick_search_id=quick_search_id)
    if not db_quick:
        raise HTTPException(status_code=404, detail="Quick search keyword not found")
    return update_quick_search(db, db_quick=db_quick, quick_search_in=quick_search_in)

@router.delete("/{quick_search_id}")
def remove_quick_search(
    quick_search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_quick_search(db, quick_search_id=quick_search_id)
    if not success:
        raise HTTPException(status_code=404, detail="Quick search keyword not found")
    return {"detail": "Quick search keyword deleted successfully"}
