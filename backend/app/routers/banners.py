from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud.ad_banner import get_banner, get_all_banners, create_banner, update_banner, delete_banner
from app.schemas.ad_banner import AdBannerCreate, AdBannerResponse, AdBannerUpdate
from app.routers.auth import get_current_user, require_admin
from app.models.user import User
from app.services.storage import storage_service
import uuid

router = APIRouter(prefix="/banners", tags=["Ad Banners"])
public_router = APIRouter(prefix="/content-panels", tags=["Content Panels"])

@router.get("/", response_model=List[AdBannerResponse])
def read_banners(db: Session = Depends(get_db)):
    return get_all_banners(db)

@public_router.get("/", response_model=List[AdBannerResponse])
def read_content_panels(db: Session = Depends(get_db)):
    """Neutral public alias so browser privacy extensions do not block CMS content."""
    return get_all_banners(db)

@router.post("/upload-media")
async def upload_ad_media(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ JPG, PNG, GIF, WebP, MP4 hoặc WebM")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tệp quảng cáo không được vượt quá 50 MB")
    extension = (file.filename or "media").rsplit(".", 1)[-1].lower()
    url = storage_service.upload_file(content, f"banners/{uuid.uuid4().hex}.{extension}", file.content_type or "application/octet-stream")
    return {"url": url, "media_type": "video" if (file.content_type or "").startswith("video/") else "image"}

@router.post("/", response_model=AdBannerResponse)
def add_banner(
    banner_in: AdBannerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return create_banner(db, banner=banner_in)

@router.put("/{banner_id}", response_model=AdBannerResponse)
def edit_banner(
    banner_id: int,
    banner_in: AdBannerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_banner = get_banner(db, banner_id)
    if not db_banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    return update_banner(db, db_banner=db_banner, banner_data=banner_in.model_dump(exclude_unset=True))

@router.delete("/{banner_id}")
def remove_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    success = delete_banner(db, banner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"detail": "Banner deleted successfully"}
