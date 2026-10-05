from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.crud.news import get_news, get_news_by_slug, get_all_news, create_news, update_news, delete_news
from app.schemas.news import NewsResponse, NewsCreate, NewsUpdate
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.storage import storage_service

router = APIRouter(prefix="/news", tags=["News Management"])

@router.get("/", response_model=List[NewsResponse])
def read_all_news(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = Query(None, description="Cẩm nang du lịch, Tin tức sự kiện, etc."),
    db: Session = Depends(get_db)
):
    return get_all_news(db, skip=skip, limit=limit, category=category)

@router.get("/{slug}", response_model=NewsResponse)
def read_news_by_slug(slug: str, db: Session = Depends(get_db)):
    db_news = get_news_by_slug(db, slug=slug)
    if not db_news:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return db_news

@router.post("/", response_model=NewsResponse)
def add_news(
    news_in: NewsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = get_news_by_slug(db, slug=news_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Đường dẫn bài viết đã tồn tại")
    return create_news(db, news=news_in)

@router.put("/{news_id}", response_model=NewsResponse)
def edit_news(
    news_id: int,
    news_in: NewsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_news = get_news(db, news_id=news_id)
    if not db_news:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return update_news(db, db_news=db_news, news=news_in)

@router.delete("/{news_id}")
def remove_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = delete_news(db, news_id=news_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return {"detail": "Đã xóa bài viết thành công"}

@router.post("/upload-image")
async def upload_news_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Strict validation on file extension and content type
    allowed_extensions = {"jpg", "jpeg", "png", "gif", "webp"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Chỉ cho phép tải lên các tệp tin hình ảnh (.jpg, .jpeg, .png, .gif, .webp)."
        )
    
    allowed_content_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail="Định dạng tệp tin ảnh không hợp lệ."
        )

    try:
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Ảnh không được vượt quá 10 MB.")
        unique_filename = f"news/{uuid.uuid4()}.{ext}"
        
        file_url = storage_service.upload_file(
            file_content=content,
            filename=unique_filename,
            content_type=file.content_type
        )
        return {"url": file_url, "media_type": "image"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể tải ảnh lên máy chủ: {str(e)}")


@router.post("/upload-video")
async def upload_news_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload video bài viết lên VPS; chỉ nhận định dạng phát tốt trên trình duyệt."""
    allowed_extensions = {"mp4", "webm"}
    allowed_content_types = {"video/mp4", "video/webm"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed_extensions or file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ video MP4 hoặc WebM.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video không được vượt quá 50 MB.")
    if not content:
        raise HTTPException(status_code=400, detail="Tệp video đang trống.")

    try:
        file_url = storage_service.upload_file(
            file_content=content,
            filename=f"news/{uuid.uuid4()}.{ext}",
            content_type=file.content_type
        )
        return {"url": file_url, "media_type": "video"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể tải video lên máy chủ: {str(e)}")
