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
                if origin not in settings.FRONTEND_ORIGINS and origin != f'{request.scheme}://{request.get_host()}':
                    return JsonResponse({'message': 'Запрос с чужого сайта отклонён', 'code': 'origin'}, status=403)
            elif request.COOKIES.get(settings.SESSION_COOKIE_NAME):
                # браузер всегда шлёт Origin на POST; без него и с сессией — подозрительно
                return JsonResponse({'message': 'Запрос отклонён', 'code': 'origin'}, status=403)
            content_type = request.content_type or ''
            if request.META.get('CONTENT_LENGTH', '0') not in ('', '0') and content_type not in ('application/json', 'multipart/form-data'):
                return JsonResponse({'message': 'Ожидается JSON', 'code': 'content_type'}, status=415)
        return self.get_response(request)


class ApiSecurityMiddleware:
    """Bound declared bodies and attach a server-generated trace ID to every API response."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import uuid
        from django.core.exceptions import RequestDataTooBig, TooManyFieldsSent, TooManyFilesSent
        request.request_id = uuid.uuid4().hex
        limit = settings.MAX_UPLOAD_BYTES + settings.MAX_JSON_BYTES if request.content_type == 'multipart/form-data' else settings.MAX_JSON_BYTES
        try:
            length = int(request.META.get('CONTENT_LENGTH') or 0)
        except ValueError:
            length = -1
        media_prefix = '/' + settings.MEDIA_URL.strip('/')
        if request.path.startswith(media_prefix + '/documents/'):
            response = JsonResponse({'message': 'Не найдено', 'code': 'not_found'}, status=404)
        elif length < 0 or length > limit:
            response = JsonResponse({'message': 'Запрос слишком большой', 'code': 'request_too_large'}, status=413)
        else:
            try:
                response = self.get_response(request)
            except (RequestDataTooBig, TooManyFieldsSent, TooManyFilesSent):
                response = JsonResponse({'message': 'Запрос слишком большой', 'code': 'request_too_large'}, status=413)
        response['X-Request-ID'] = request.request_id
        response['Cache-Control'] = 'no-store'
        response['Referrer-Policy'] = 'no-referrer'
        response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
        response['Cross-Origin-Resource-Policy'] = 'same-site'
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        return response


class ProxyHeadersMiddleware:
    """Forwarded scheme is meaningful only when received from an explicitly trusted peer."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import ipaddress
        try:
            peer = ipaddress.ip_address(request.META.get('REMOTE_ADDR', ''))
            trusted = any(peer in ipaddress.ip_network(cidr) for cidr in settings.TRUSTED_PROXY_CIDRS)
        except ValueError:
            trusted = False
        if not trusted:
            request.META.pop('HTTP_X_FORWARDED_PROTO', None)
            request.META.pop('HTTP_FORWARDED', None)
        return self.get_response(request)
