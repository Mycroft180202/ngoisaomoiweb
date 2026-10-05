from sqlalchemy.orm import Session
from app.models.menu import NavigationMenu
from app.schemas.menu import NavigationMenuCreate

def get_menu(db: Session, menu_id: int):
    return db.query(NavigationMenu).filter(NavigationMenu.id == menu_id).first()

def get_all_menus(db: Session):
    # Retrieve top-level menu items (where parent_id is NULL) and sort them
    return db.query(NavigationMenu).filter(NavigationMenu.parent_id == None).order_by(NavigationMenu.order_index).all()

def get_flat_menus(db: Session):
    # Retrieve all menu items for list/dropdown management
    return db.query(NavigationMenu).order_by(NavigationMenu.order_index).all()

def create_menu(db: Session, menu: NavigationMenuCreate):
    db_menu = NavigationMenu(
        title=menu.title,
        url=menu.url,
        parent_id=menu.parent_id,
        order_index=menu.order_index,
        is_active=menu.is_active
    )
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

def update_menu(db: Session, db_menu: NavigationMenu, menu_data: dict):
    for key, val in menu_data.items():
        setattr(db_menu, key, val)
    db.commit()
    db.refresh(db_menu)
    return db_menu

def delete_menu(db: Session, menu_id: int):
    db_menu = get_menu(db, menu_id)
    if db_menu:
        db.delete(db_menu)
        db.commit()
        return True
    return False
