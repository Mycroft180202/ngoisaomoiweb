import os
import re
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def remove_vietnamese_accents(s: str) -> str:
    """Convert Vietnamese characters to unsigned ASCII equivalents."""
    patterns = {
        '[àáảãạăằắẳẵặâầấẩẫậ]': 'a',
        '[èéẻẽẹêềếểễệ]': 'e',
        '[ìíỉĩị]': 'i',
        '[òóỏõọôồốổỗộơờớởỡợ]': 'o',
        '[ùúủũụưừứửữự]': 'u',
        '[ỳýỷỹỵ]': 'y',
        '[đ]': 'd',
        '[ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ]': 'A',
        '[ÈÉẺẼẸÊỀẾỂỄỆ]': 'E',
        '[ÌÍỈĨỊ]': 'I',
        '[ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]': 'O',
        '[ÙÚỦŨỤƯỪỨỬỮỰ]': 'U',
        '[ỲÝỶỸỴ]': 'Y',
        '[Đ]': 'D'
    }
    for pattern, replacement in patterns.items():
        s = re.sub(pattern, replacement, s)
    return s

def secure_filename(filename: str) -> str:
    """Sanitize filename to be safe for filesystem storage, using clean hyphens for SEO."""
    name, ext = os.path.splitext(filename)
    # Convert Vietnamese signs
    name = remove_vietnamese_accents(name)
    # Convert to lowercase
    name = name.lower()
    # Replace spaces, dots, hyphens, and other special characters with hyphens
    name = re.sub(r'[^a-z0-9_\-]', '-', name)
    # Collapse multiple hyphens/underscores to a single hyphen
    name = re.sub(r'[\-_]+', '-', name).strip('-')
    if not name:
        name = "file"
    return f"{name}{ext.lower()}"

class StorageService:
    def __init__(self):
        self.upload_dir = os.path.join("static", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)
        logger.info(f"Local storage service initialized. Upload directory: {self.upload_dir}")

    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        try:
            # 1. Determine subfolder and file name based on content type and path prefix
            ext = os.path.splitext(filename)[1].lower()
            is_doc = ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"] or \
                     (content_type and any(doc_type in content_type for doc_type in ["pdf", "msword", "officedocument", "text"]))

            if is_doc:
                subfolder = "documents"
                base_name = secure_filename(os.path.basename(filename))
            else:
                # We categorize images based on the filename prefix
                if filename.startswith("avatars/"):
                    subfolder = os.path.join("images", "avatars")
                    base_name = os.path.basename(filename)
                elif filename.startswith("tours/"):
                    subfolder = os.path.join("images", "tours")
                    base_name = os.path.basename(filename)
                elif filename.startswith("news/"):
                    subfolder = os.path.join("images", "news")
                    base_name = os.path.basename(filename)
                elif filename.startswith("banners/"):
                    subfolder = os.path.join("images", "banners")
                    base_name = os.path.basename(filename)
                else:
                    subfolder = os.path.join("images", "others")
                    base_name = os.path.basename(filename)

            # Ensure subfolder exists
            target_dir = os.path.join(self.upload_dir, subfolder)
            os.makedirs(target_dir, exist_ok=True)

            # Construct target filepath
            filepath = os.path.join(target_dir, base_name)
            
            # Prevent name collision for documents by appending counter
            if is_doc and os.path.exists(filepath):
                name_part, ext_part = os.path.splitext(base_name)
                counter = 1
                while os.path.exists(os.path.join(target_dir, f"{name_part}_{counter}{ext_part}")):
                    counter += 1
                base_name = f"{name_part}_{counter}{ext_part}"
                filepath = os.path.join(target_dir, base_name)

            # Write the file content locally
            with open(filepath, "wb") as f:
                f.write(file_content)

            logger.info(f"File {base_name} uploaded to {filepath} (subfolder: {subfolder})")

            # 2. Return public URL
            if is_doc:
                # E.g. https://newstartour.vn/tour/file.pdf (frontend root route)
                frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
                frontend_url = frontend_url.rstrip("/")
                return f"{frontend_url}/tour/{base_name}"
            else:
                # E.g. https://api.newstartour.vn/static/uploads/images/tours/uuid.jpg
                backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
                backend_url = backend_url.rstrip("/")
                # Replace OS backslashes with forward slashes for URL path
                url_subfolder = subfolder.replace("\\", "/")
                return f"{backend_url}/static/uploads/{url_subfolder}/{base_name}"

        except Exception as e:
            logger.error(f"Error uploading file {filename} locally: {e}")
            raise e

storage_service = StorageService()
