from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.crud.tour import get_tour, get_tour_by_slug, get_tours, create_tour, update_tour, delete_tour
from app.schemas.tour import TourResponse, TourCreate, TourUpdate, TourImageCreate, TourImageResponse
from app.routers.auth import get_current_user, get_optional_current_user, ensure_admin_roles
from app.models.user import User
from app.models.tour import Tour, TourImage
from app.models.tour import TourAuditLog
from fastapi.encoders import jsonable_encoder
from app.services.storage import storage_service
from app.services.crm_sync import sync_tour_to_crm

router = APIRouter(prefix="/tours", tags=["Tours Management"])

def _audit_tour(db: Session, current_user: User, action: str, tour_id: Optional[int], title: Optional[str], changes=None):
    db.add(TourAuditLog(
        tour_id=tour_id, tour_title=title, action=action, actor_id=current_user.id,
        actor_name=current_user.full_name, actor_identifier=current_user.username or current_user.email,
        actor_role=current_user.role, changes=jsonable_encoder(changes or {}),
    ))
    db.commit()

@router.get("/", response_model=List[TourResponse])
def read_tours(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = Query(None, description="inbound or outbound"),
    region: Optional[str] = Query(None, description="Miền Bắc, Miền Trung, Miền Nam, Châu Á, etc."),
    is_featured: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, description="Search by title, location or description"),
    include_inactive: bool = Query(False, description="Include inactive tours (admin only)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Only admins can see inactive tours
    active_only = not (include_inactive and current_user and current_user.is_admin)
    return get_tours(
        db,
        skip=skip,
        limit=limit,
        category=category,
        region=region,
        is_featured=is_featured,
        search_query=search,
        active_only=active_only
    )

@router.post("/sync-crm/all")
def sync_all_tours_to_crm(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin_roles(current_user, {"super_admin", "manager"}, "Chỉ Manager hoặc Super Admin được đồng bộ toàn bộ Tour")
    all_ids = [row[0] for row in db.query(Tour.id).order_by(Tour.id).all()]
    results = [sync_tour_to_crm(tour_id) for tour_id in all_ids]
    return {
        "total": len(results),
        "synced": sum(item["status"] == "synced" for item in results),
        "failed": sum(item["status"] == "failed" for item in results),
        "not_configured": sum(item["status"] == "not_configured" for item in results),
        "results": results,
    }

@router.post("/sync-crm/{tour_id}")
def sync_one_tour_to_crm(
    tour_id: int,
    current_user: User = Depends(get_current_user),
):
    ensure_admin_roles(current_user, {"super_admin", "manager"}, "Chỉ Manager hoặc Super Admin được đồng bộ Tour thủ công")
    result = sync_tour_to_crm(tour_id)
    if result["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Tour not found")
    return result

@router.get("/audit-logs")
def read_tour_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin_roles(current_user, {"super_admin", "manager"}, "Chỉ Manager hoặc Super Admin được xem audit Tour")
    rows = db.query(TourAuditLog).order_by(TourAuditLog.created_at.desc()).limit(limit).all()
    return [{
        "id": row.id, "tour_id": row.tour_id, "tour_title": row.tour_title,
        "action": row.action, "actor_name": row.actor_name,
        "actor_identifier": row.actor_identifier, "actor_role": row.actor_role,
        "changes": row.changes, "created_at": row.created_at,
    } for row in rows]

@router.get("/{slug}", response_model=TourResponse)
def read_tour_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if slug.isdigit():
        db_tour = get_tour(db, tour_id=int(slug))
    else:
        db_tour = get_tour_by_slug(db, slug=slug)
        
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour not found")
        
    if not db_tour.is_active and not (current_user and current_user.is_admin):
        raise HTTPException(status_code=404, detail="Tour not found")
        
    return db_tour

@router.post("/", response_model=TourResponse)
def add_tour(
    tour_in: TourCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    existing = get_tour_by_slug(db, slug=tour_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Tour slug already exists")
    created = create_tour(db, tour=tour_in, created_by_id=current_user.id)
    _audit_tour(db, current_user, "create", created.id, created.title, {"slug": created.slug, "price": created.price})
    background_tasks.add_task(sync_tour_to_crm, created.id)
    return created

@router.put("/{tour_id}", response_model=TourResponse)
def edit_tour(
    tour_id: int,
    tour_in: TourUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    db_tour = get_tour(db, tour_id=tour_id)
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    if current_user.role == "sale" and db_tour.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn chỉ được chỉnh sửa Tour do chính mình tạo")
    effective_international = tour_in.is_international if tour_in.is_international is not None else db_tour.is_international
    effective_domestic = tour_in.destination_domestic_id if "destination_domestic_id" in tour_in.model_fields_set else db_tour.destination_domestic_id
    effective_foreign = tour_in.destination_foreign_id if "destination_foreign_id" in tour_in.model_fields_set else db_tour.destination_foreign_id
    if effective_international and effective_domestic is not None:
        raise HTTPException(status_code=422, detail="Tour quốc tế không được chọn điểm đến trong nước")
    if not effective_international and effective_foreign is not None:
        raise HTTPException(status_code=422, detail="Tour trong nước không được chọn điểm đến nước ngoài")
    updated = update_tour(db, db_tour=db_tour, tour=tour_in)
    _audit_tour(db, current_user, "update", updated.id, updated.title, tour_in.model_dump(exclude_unset=True))
    background_tasks.add_task(sync_tour_to_crm, updated.id)
    return updated

@router.delete("/{tour_id}")
def remove_tour(
    tour_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ensure_admin_roles(current_user, {"super_admin", "manager"}, "Sale không được xóa vĩnh viễn Tour; hãy tắt hiển thị hoặc liên hệ Manager")
    existing = get_tour(db, tour_id=tour_id)
    title = existing.title if existing else None
    success = delete_tour(db, tour_id=tour_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tour not found")
    _audit_tour(db, current_user, "delete", tour_id, title)
    return {"detail": "Tour deleted successfully"}

# ── Image endpoints ─────────────────────────────────────────────────────────

@router.post("/upload-image")
def upload_tour_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a single image to Google Drive and return its public URL."""
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    
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
        content = file.file.read()
        unique_filename = f"tours/{uuid.uuid4()}.{ext}"
        
        file_url = storage_service.upload_file(
            file_content=content,
            filename=unique_filename,
            content_type=file.content_type
        )
        return {"url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

@router.post("/upload-document")
def upload_tour_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a tour program document (PDF, Word, etc.) to local storage."""
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})

    # Strict validation on document extensions
    allowed_doc_extensions = {"pdf", "doc", "docx", "xls", "xlsx", "txt"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_doc_extensions:
        raise HTTPException(
            status_code=400,
            detail="Chỉ cho phép tải lên tài liệu định dạng PDF, Word, Excel hoặc văn bản (.pdf, .doc, .docx, .xls, .xlsx, .txt)."
        )

    try:
        content = file.file.read()
        file_url = storage_service.upload_file(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type
        )
        return {"url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

@router.get("/{tour_id}/images", response_model=List[TourImageResponse])
def get_tour_images(
    tour_id: int,
    db: Session = Depends(get_db)
):
    """Get all images for a tour."""
    db_tour = get_tour(db, tour_id=tour_id)
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour not found")
    return db_tour.images

@router.post("/{tour_id}/images", response_model=TourImageResponse)
def add_tour_image(
    tour_id: int,
    image_in: TourImageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a single image record to a tour after uploading."""
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    db_tour = get_tour(db, tour_id=tour_id)
    if not db_tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    # If setting this image as primary, unset all others
    if image_in.is_primary:
        db.query(TourImage).filter(TourImage.tour_id == tour_id).update({"is_primary": False})

    db_image = TourImage(
        tour_id=tour_id,
        url=image_in.url,
        image_type=image_in.image_type,
        is_primary=image_in.is_primary,
        order_index=image_in.order_index,
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

@router.delete("/{tour_id}/images/{image_id}")
def remove_tour_image(
    tour_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific image from a tour."""
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    db_image = db.query(TourImage).filter(
        TourImage.id == image_id,
        TourImage.tour_id == tour_id
    ).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.delete(db_image)
    db.commit()
    return {"detail": "Image deleted"}

@router.put("/{tour_id}/images/{image_id}/set-primary")
def set_primary_image(
    tour_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Set an image as the primary thumbnail for homepage/listing display."""
    ensure_admin_roles(current_user, {"super_admin", "manager", "editor", "sale"})
    # Unset all primaries for this tour
    db.query(TourImage).filter(TourImage.tour_id == tour_id).update({"is_primary": False})
    # Set the new primary
    db_image = db.query(TourImage).filter(
        TourImage.id == image_id,
        TourImage.tour_id == tour_id
    ).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    db_image.is_primary = True
    db.commit()
    db.refresh(db_image)
    return db_image
