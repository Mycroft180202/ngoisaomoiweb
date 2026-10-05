from sqlalchemy.orm import Session
from app.models.contact import ContactMessage
from app.schemas.contact import ContactMessageCreate

def get_contact_message(db: Session, msg_id: int):
    return db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()

def get_all_contact_messages(db: Session):
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()

def create_contact_message(db: Session, msg: ContactMessageCreate):
    db_msg = ContactMessage(
        name=msg.name,
        email=msg.email,
        phone=msg.phone,
        subject=msg.subject,
        message=msg.message,
        status=msg.status
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def update_contact_message(db: Session, db_msg: ContactMessage, msg_data: dict):
    for key, val in msg_data.items():
        setattr(db_msg, key, val)
    db.commit()
    db.refresh(db_msg)
    return db_msg

def delete_contact_message(db: Session, msg_id: int):
    db_msg = get_contact_message(db, msg_id)
    if db_msg:
        db.delete(db_msg)
        db.commit()
        return True
    return False
