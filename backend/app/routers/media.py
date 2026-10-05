from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import mimetypes
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.models.user import User
from app.routers.auth import require_admin
from app.services.storage import storage_service
from app.core.config import settings

router = APIRouter(prefix="/media-library", tags=["Media Library"])

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
    ".mp4", ".webm", ".mov", ".pdf", ".doc", ".docx",
    ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
}


def _root() -> Path:
    return Path(storage_service.upload_dir).resolve()


def _public_url(relative_path: str) -> str:
    base = getattr(settings, "BACKEND_URL", "http://localhost:8000").rstrip("/")
    return f"{base}/static/uploads/{relative_path}"


@router.get("/")
def list_media(kind: Optional[str] = None, current_user: User = Depends(require_admin)):
    root = _root()
    files = []
    if not root.exists():
        return []
    for path in root.rglob("*"):
        if not path.is_file() or path.name.startswith("."):
            continue
        relative = path.relative_to(root).as_posix()
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        file_kind = "image" if mime.startswith("image/") else "video" if mime.startswith("video/") else "document"
        if kind and kind != "all" and kind != file_kind:
            continue
        stat = path.stat()
        files.append({
            "path": relative, "name": path.name, "url": _public_url(relative),
            "mime_type": mime, "kind": file_kind, "size": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        })
    return sorted(files, key=lambda item: item["modified_at"], reverse=True)


@router.post("/upload")
async def upload_media(file: UploadFile = File(...), current_user: User = Depends(require_admin)):
    extension = Path(file.filename or "file").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Định dạng tệp không được hỗ trợ")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Tệp không được vượt quá 50 MB")
    url = storage_service.upload_file(content, f"media/{uuid.uuid4().hex}{extension}", file.content_type or "application/octet-stream")
    return {"url": url}


@router.delete("/{file_path:path}")
def delete_media(file_path: str, current_user: User = Depends(require_admin)):
    root = _root()
    target = (root / file_path).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Đường dẫn tệp không hợp lệ")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp")
    target.unlink()
    return {"detail": "Đã xóa tệp"}
