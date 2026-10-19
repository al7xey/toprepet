import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, UnidentifiedImageError

from core.errors import ApiError

MAX_PHOTO_BYTES = 3_000_000


def save_photo(request) -> str:
    """Принимает файл `file` из запроса, проверяет, что это JPG, PNG или WebP до 3 МБ, сохраняет и возвращает ссылку."""
    file = request.FILES.get('file')
    if not file:
        raise ApiError('Выберите файл')
    if file.size > MAX_PHOTO_BYTES:
        raise ApiError('Фото больше 3 МБ. Выберите файл поменьше.')
    try:
        image = Image.open(file)
        image.verify()
        fmt = (image.format or '').lower()
    except (UnidentifiedImageError, OSError):
        raise ApiError('Нужна картинка: JPG, PNG или WebP.')
    if fmt not in ('jpeg', 'png', 'webp'):
        raise ApiError('Нужна картинка: JPG, PNG или WebP.')
    file.seek(0)
    name = default_storage.save(f'photos/{uuid.uuid4().hex}.{"jpg" if fmt == "jpeg" else fmt}', ContentFile(file.read()))
    return request.build_absolute_uri(settings.MEDIA_URL + name)
