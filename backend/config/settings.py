"""Настройки TopRepet. Всё, что отличается между машинами, берётся из переменных окружения (см. docs/backend.md)."""
import os
import sys
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name: str, default: str = '') -> str:
    return os.environ.get(name, default)


def env_list(name: str, default: str = '') -> list[str]:
    return [item.strip() for item in env(name, default).split(',') if item.strip()]


TESTING = 'pytest' in sys.modules
DEBUG = env('DEBUG', '1') == '1'
SECRET_KEY = env('SECRET_KEY', 'dev-only-secret-key-change-me' if DEBUG else '')
if not SECRET_KEY:
    raise RuntimeError('Задайте SECRET_KEY')
ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', '*' if DEBUG else '')

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'core',
    'accounts',
    'tutors',
    'lessons',
    'reviews',
    'requests_board',
    'chats',
    'payments',
    'notifications',
    'adminpanel',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.OriginCheckMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': ['django.template.context_processors.request', 'django.contrib.auth.context_processors.auth']},
}]

DATABASES = {'default': dj_database_url.parse(env('DATABASE_URL', f'sqlite:///{BASE_DIR / "db.sqlite3"}'), conn_max_age=60)}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [{'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}}]
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher'] if TESTING else ['django.contrib.auth.hashers.PBKDF2PasswordHasher']

LANGUAGE_CODE = 'ru'
TIME_ZONE = 'UTC'
USE_I18N = False
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = env('MEDIA_URL', '/media/')
MEDIA_ROOT = Path(env('MEDIA_ROOT', str(BASE_DIR / 'media')))

# Сайт (toprepet.ru) и API (api.toprepet.ru) — один «сайт» для браузера, поэтому SameSite=Lax хватает.
FRONTEND_ORIGINS = env_list('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5199,http://127.0.0.1:5199')
CORS_ALLOWED_ORIGINS = FRONTEND_ORIGINS
CORS_ALLOW_CREDENTIALS = True
SESSION_COOKIE_NAME = 'toprepet_session'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_DOMAIN = env('SESSION_COOKIE_DOMAIN') or None
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30
SECURE_SSL_REDIRECT = env('SECURE_SSL_REDIRECT', '0' if DEBUG else '1') == '1'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_INCLUDE_SUBDOMAINS = env('HSTS_SUBDOMAINS') == '1'
SECURE_HSTS_PRELOAD = env('HSTS_PRELOAD') == '1'
# CSRF-токен не нужен: cookie SameSite=Lax + проверка Origin + только JSON/multipart (core.middleware.OriginCheckMiddleware).
SILENCED_SYSTEM_CHECKS = ['security.W003']

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['core.auth.SessionAuth'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser', 'rest_framework.parsers.MultiPartParser'],
    'EXCEPTION_HANDLER': 'core.errors.exception_handler',
    'DEFAULT_THROTTLE_RATES': {'auth': '100000/min' if TESTING else env('AUTH_THROTTLE', '30/min')},
}

# Почта: в разработке письма печатаются в консоль; в проде задайте EMAIL_URL=smtp://user:pass@host:587 (см. docs/backend.md).
_email = env('EMAIL_URL')
if _email:
    from urllib.parse import unquote, urlparse
    _u = urlparse(_email)
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST, EMAIL_PORT = _u.hostname, _u.port or 587
    EMAIL_HOST_USER, EMAIL_HOST_PASSWORD = unquote(_u.username or ''), unquote(_u.password or '')
    EMAIL_USE_TLS = _u.scheme == 'smtp'
    EMAIL_USE_SSL = _u.scheme == 'smtps'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', 'TopRepet <noreply@toprepet.ru>')
SITE_URL = env('SITE_URL', 'http://localhost:5173').rstrip('/')

# Платежи: сейчас заглушка; провайдера меняет одна переменная (см. payments/providers.py).
PAYMENT_PROVIDER = env('PAYMENT_PROVIDER', 'fake')
SERVICE_FEE = 0.10
# Видеосвязь: пока одна общая ссылка-заглушка, на этапе подключения Телемоста/Zoom здесь будет создание комнаты на урок.
MEETING_URL = env('MEETING_URL', 'https://telemost.yandex.ru/')
YANDEX_CLIENT_ID = env('YANDEX_CLIENT_ID')
YANDEX_CLIENT_SECRET = env('YANDEX_CLIENT_SECRET')

LOGGING = {'version': 1, 'disable_existing_loggers': False, 'handlers': {'console': {'class': 'logging.StreamHandler'}}, 'root': {'handlers': ['console'], 'level': env('LOG_LEVEL', 'INFO')}}
