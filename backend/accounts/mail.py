from django.conf import settings
from django.core.mail import send_mail

from core.errors import ApiError


def ensure_mail_available():
    if not settings.EMAIL_CONFIGURED:
        raise ApiError('Сервис писем временно недоступен', 503, 'mail_unavailable')


SIGNATURE = '\n\nКоманда TopRepet'


def send_verification(user, token: str):
    ensure_mail_available()
    link = f'{settings.SITE_URL}/auth/verify?token={token}'
    send_mail('Подтвердите почту на TopRepet', f'Здравствуйте, {user.name}!\n\nПодтвердите почту по ссылке: {link}\nСсылка действует сутки.{SIGNATURE}', settings.DEFAULT_FROM_EMAIL, [user.email])


def send_reset(user, token: str):
    ensure_mail_available()
    link = f'{settings.SITE_URL}/reset-password?token={token}'
    send_mail('Сброс пароля на TopRepet', f'Здравствуйте, {user.name}!\n\nЧтобы задать новый пароль, перейдите по ссылке: {link}\nСсылка действует два часа. Если это были не вы, просто игнорируйте письмо.{SIGNATURE}', settings.DEFAULT_FROM_EMAIL, [user.email])
