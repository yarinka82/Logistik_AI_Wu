
import io
from PIL import Image, UnidentifiedImageError
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
MAX_UPLOAD_SIZE_MB = 10
MAX_IMAGE_DIMENSION = 1600
JPEG_QUALITY = 80


def validate_license_photo(file) -> None:
    ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            {
                "code": "unsupported_file_type",
                "extension": ext,
                "allowed": sorted(ALLOWED_EXTENSIONS),
            }
        )
    if file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise ValidationError(
            {"code": "file_too_large", "max_mb": MAX_UPLOAD_SIZE_MB}
        )


def compress_license_photo(file):
    """Повертає ContentFile: PDF без змін, зображення — стиснуті/зменшені."""
    ext = file.name.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return file

    try:
        image = Image.open(file)
        image.verify()
        file.seek(0)
        image = Image.open(file)
    except UnidentifiedImageError:
        raise ValidationError({"code": "corrupted_image"})

    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    if max(image.size) > MAX_IMAGE_DIMENSION:
        image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    buffer.seek(0)

    new_name = file.name.rsplit(".", 1)[0] + ".jpg"
    return ContentFile(buffer.read(), name=new_name)