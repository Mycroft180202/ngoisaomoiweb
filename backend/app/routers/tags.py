from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.tag import get_tag, get_tags, create_tag, update_tag, delete_tag
from app.schemas.tag import TagResponse, TagCreate
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tags", tags=["Tags Management"])

@router.get("/", response_model=List[TagResponse])
def read_tags(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return get_tags(db, skip=skip, limit=limit)

@router.get("/{tag_id}", response_model=TagResponse)
def read_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = get_tag(db, tag_id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return db_tag

@router.post("/", response_model=TagResponse)
def add_tag(
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_tag(db, tag=tag_in)

@router.put("/{tag_id}", response_model=TagResponse)
def edit_tag(
    tag_id: int,
    tag_in: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_tag = get_tag(db, tag_id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return update_tag(db, db_tag=db_tag, tag_in=tag_in)

@router.delete("/{tag_id}")
def remove_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_tag(db, tag_id=tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"detail": "Tag deleted successfully"}
