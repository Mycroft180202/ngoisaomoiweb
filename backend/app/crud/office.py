from sqlalchemy.orm import Session
from app.models.office import RepresentativeOffice
from app.schemas.office import RepresentativeOfficeCreate

def get_office(db: Session, office_id: int):
    return db.query(RepresentativeOffice).filter(RepresentativeOffice.id == office_id).first()

def get_all_offices(db: Session):
    return db.query(RepresentativeOffice).order_by(RepresentativeOffice.order_index).all()

def create_office(db: Session, office: RepresentativeOfficeCreate):
    db_office = RepresentativeOffice(
        name=office.name,
        address=office.address,
        phone=office.phone,
        hotline=office.hotline,
        email=office.email,
        order_index=office.order_index
    )
    db.add(db_office)
    db.commit()
    db.refresh(db_office)
    return db_office

def update_office(db: Session, db_office: RepresentativeOffice, office_data: dict):
    for key, val in office_data.items():
        setattr(db_office, key, val)
    db.commit()
    db.refresh(db_office)
    return db_office

def delete_office(db: Session, office_id: int):
    db_office = get_office(db, office_id)
    if db_office:
        db.delete(db_office)
        db.commit()
        return True
    return False
