from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.contact import get_contact_message, get_all_contact_messages, create_contact_message, update_contact_message, delete_contact_message
from app.schemas.contact import ContactMessageCreate, ContactMessageResponse, ContactMessageUpdate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/contacts", tags=["Contact Messages"])

@router.get("/", response_model=List[ContactMessageResponse])
def read_contact_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_all_contact_messages(db)

@router.post("/", response_model=ContactMessageResponse)
def add_contact_message(
    msg_in: ContactMessageCreate,
    db: Session = Depends(get_db)
):
    # Public endpoint to submit contact forms!
    return create_contact_message(db, msg=msg_in)

@router.put("/{msg_id}", response_model=ContactMessageResponse)
def edit_contact_message(
    msg_id: int,
    msg_in: ContactMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_msg = get_contact_message(db, msg_id)
    if not db_msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return update_contact_message(db, db_msg=db_msg, msg_data=msg_in.model_dump(exclude_unset=True))

@router.delete("/{msg_id}")
def remove_contact_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_contact_message(db, msg_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"detail": "Message deleted successfully"}
