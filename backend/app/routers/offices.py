from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.office import get_office, get_all_offices, create_office, update_office, delete_office
from app.schemas.office import RepresentativeOfficeCreate, RepresentativeOfficeResponse, RepresentativeOfficeUpdate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/offices", tags=["Representative Offices"])

@router.get("/", response_model=List[RepresentativeOfficeResponse])
def read_offices(db: Session = Depends(get_db)):
    return get_all_offices(db)

@router.post("/", response_model=RepresentativeOfficeResponse)
def add_office(
    office_in: RepresentativeOfficeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    return create_office(db, office=office_in)

@router.put("/{office_id}", response_model=RepresentativeOfficeResponse)
def edit_office(
    office_id: int,
    office_in: RepresentativeOfficeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    db_office = get_office(db, office_id)
    if not db_office:
        raise HTTPException(status_code=404, detail="Office not found")
    return update_office(db, db_office=db_office, office_data=office_in.model_dump(exclude_unset=True))

@router.delete("/{office_id}")
def remove_office(
    office_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    success = delete_office(db, office_id)
    if not success:
        raise HTTPException(status_code=404, detail="Office not found")
    return {"detail": "Office deleted successfully"}

