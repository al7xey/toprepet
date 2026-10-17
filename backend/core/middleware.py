from urllib.parse import urlparse

from django.conf import settings
from django.http import JsonResponse

SAFE = {'GET', 'HEAD', 'OPTIONS'}


class OriginCheckMiddleware:
    """Защита от CSRF без токена: небезопасные запросы принимаем только с известного Origin и только JSON/multipart."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in SAFE and not getattr(settings, 'SKIP_ORIGIN_CHECK', False):
            origin = request.headers.get('Origin')
            if origin:
                if origin not in settings.FRONTEND_ORIGINS and urlparse(origin).netloc != request.get_host():
                    return JsonResponse({'message': 'Запрос с чужого сайта отклонён', 'code': 'origin'}, status=403)
            elif request.COOKIES.get(settings.SESSION_COOKIE_NAME):
                # браузер всегда шлёт Origin на POST; без него и с сессией — подозрительно
                return JsonResponse({'message': 'Запрос отклонён', 'code': 'origin'}, status=403)
            content_type = request.content_type or ''
            if request.body and not (content_type.startswith('application/json') or content_type.startswith('multipart/form-data')):
                return JsonResponse({'message': 'Ожидается JSON', 'code': 'content_type'}, status=415)
        return self.get_response(request)
