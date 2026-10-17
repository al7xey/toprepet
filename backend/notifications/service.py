from django.contrib.auth import get_user_model

from .models import Notification


def notify(user, kind: str, title: str, text: str = '', link: str | None = None):
    """Положить уведомление пользователю (user — объект или None, например у демо-репетитора без аккаунта)."""
    if user is None:
        return None
    return Notification.objects.create(user=user, kind=kind, title=title, text=text, link=link)


def notify_admins(kind: str, title: str, text: str = '', link: str | None = None):
    for admin in get_user_model().objects.filter(role='admin', is_active=True):
        notify(admin, kind, title, text, link)


def tutor_user(tutor):
    return tutor.user
