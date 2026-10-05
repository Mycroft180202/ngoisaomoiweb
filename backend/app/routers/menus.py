from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.menu import get_menu, get_all_menus, get_flat_menus, create_menu, update_menu, delete_menu
from app.schemas.menu import NavigationMenuCreate, NavigationMenuResponse, NavigationMenuUpdate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/menus", tags=["Navigation Menus"])

@router.get("/", response_model=List[NavigationMenuResponse])
def read_nested_menus(db: Session = Depends(get_db)):
    return get_all_menus(db)

@router.get("/flat", response_model=List[NavigationMenuResponse])
def read_flat_menus(db: Session = Depends(get_db)):
    return get_flat_menus(db)

@router.post("/", response_model=NavigationMenuResponse)
def add_menu(
    menu_in: NavigationMenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_menu(db, menu=menu_in)

@router.put("/{menu_id}", response_model=NavigationMenuResponse)
def edit_menu(
    menu_id: int,
    menu_in: NavigationMenuUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_menu = get_menu(db, menu_id)
    if not db_menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    return update_menu(db, db_menu=db_menu, menu_data=menu_in.model_dump(exclude_unset=True))

@router.delete("/{menu_id}")
def remove_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_menu(db, menu_id)
    if not success:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"detail": "Menu deleted successfully"}
