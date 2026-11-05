"""Validate and normalize uploads independently of browser compression."""
import io
import uuid
import warnings

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps, UnidentifiedImageError

from core.errors import ApiError

MAX_PHOTO_BYTES = 10_000_000
MAX_PHOTO_PIXELS = 20_000_000


def normalize_photo(file):
    if not file:
        raise ApiError('Выберите файл')
    if file.size > MAX_PHOTO_BYTES:
        raise ApiError('Файл больше 10 МБ.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(file) as source:
                fmt = (source.format or '').lower()
                if fmt not in ('jpeg', 'png', 'webp') or source.width * source.height > MAX_PHOTO_PIXELS:
                    raise ApiError('Нужна картинка JPG, PNG или WebP до 20 мегапикселей.')
                source.load()
                image = ImageOps.exif_transpose(source)
                image.thumbnail((1600, 1600))
                mode = 'RGBA' if image.mode == 'RGBA' or 'transparency' in image.info else 'RGB'
                image = image.convert(mode)
                clean = Image.new(mode, image.size)
                clean.paste(image)
                output = io.BytesIO()
                clean.save(output, format=fmt.upper(), **({'quality': 85} if fmt != 'png' else {}))
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ApiError('Нужна картинка: JPG, PNG или WebP.')
    return output.getvalue(), ('jpg' if fmt == 'jpeg' else fmt)


def save_photo(request) -> str:
    data, ext = normalize_photo(request.FILES.get('file'))
    name = default_storage.save(f'photos/{uuid.uuid4().hex}.{ext}', ContentFile(data))
    return request.build_absolute_uri(default_storage.url(name))
