from django.conf import settings
from django.core.files.uploadhandler import FileUploadHandler

from .errors import ApiError


class BoundedUploadHandler(FileUploadHandler):
    """Count streamed bytes across all parts, including files with a false size header."""
    def __init__(self, request=None):
        super().__init__(request)
        self.received = 0

    def receive_data_chunk(self, raw_data, start):
        self.received += len(raw_data)
        if self.received > settings.MAX_UPLOAD_BYTES:
            raise ApiError('Загрузка превышает допустимый размер', 413, 'upload_too_large')
        return raw_data

    def file_complete(self, file_size):
        return None
