from rest_framework.authentication import BaseAuthentication


class SessionAuth(BaseAuthentication):
    """Сессия Django без токена CSRF: защиту дают SameSite=Lax cookie, JSON-only и проверка Origin (core.middleware)."""

    def authenticate(self, request):
        user = getattr(request._request, 'user', None)
        if user is None or not user.is_authenticated:
            return None
        return (user, None)

    def authenticate_header(self, request):
        return 'Session'
