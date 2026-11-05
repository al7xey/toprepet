from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import permissions
from rest_framework.response import Response
from core.throttling import DatabaseRateThrottle
from core.views import APIView, PublicAPIView

from core.errors import ApiError
from core.audit import record

from .mail import send_reset, send_verification, ensure_mail_available
from .models import EmailToken, User
from services.images import save_photo

from .serializers import PasswordChangeIn, ResetConfirmIn, EmailIn, TokenIn, NOTIFY_DEFAULTS, LoginIn, MePatchIn, OnboardingIn, SignupIn, user_json


class Throttled(PublicAPIView):
    throttle_classes = [DatabaseRateThrottle]
    throttle_scope = 'auth'


class MeView(APIView):
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            raise ApiError('Войдите, чтобы продолжить', 401, 'unauthorized')
        return Response(user_json(request.user))

    @transaction.atomic
    def patch(self, request):
        _require(request)
        data = MePatchIn(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.select_for_update(no_key=True).get(pk=request.user.pk)
        fields = []
        if 'name' in data.validated_data:
            name = data.validated_data['name'].strip()
            if not name:
                raise ApiError('Укажите имя')
            user.name = name
            fields.append('name')
        if 'timezone' in data.validated_data:
            try:
                ZoneInfo(data.validated_data['timezone'])
            except (ZoneInfoNotFoundError, ValueError):
                raise ApiError('Неизвестный часовой пояс')
            user.timezone = data.validated_data['timezone']
            fields.append('timezone')
        if 'notifications' in data.validated_data:
            allowed = {k: v for k, v in data.validated_data['notifications'].items() if k in NOTIFY_DEFAULTS}
            user.notify_prefs = {**(user.notify_prefs or {}), **allowed}
            fields.append('notify_prefs')
        if fields:
            user.save(update_fields=fields)
        return Response(user_json(user))


class MePhotoView(APIView):
    throttle_scope = 'upload'
    def post(self, request):
        _require(request)
        user = request.user
        user.photo = save_photo(request)
        user.save(update_fields=['photo'])
        return Response(user_json(user))


class MePasswordView(APIView):
    @transaction.atomic
    def post(self, request):
        _require(request)
        parsed = PasswordChangeIn(data=request.data)
        parsed.is_valid(raise_exception=True)
        user = User.objects.select_for_update(no_key=True).get(pk=request.user.pk)
        current, new = parsed.validated_data['current'], parsed.validated_data['password']
        if not user.check_password(current):
            raise ApiError('Текущий пароль указан неверно')
        try:
            validate_password(new, user)
        except DjangoValidationError as error:
            raise ApiError(error.messages[0])
        user.set_password(new)
        user.save(update_fields=['password'])
        update_session_auth_hash(request._request, user)
        record(user, 'account.password_change', user.pk)
        return Response({'ok': True})


def _require(request):
    if not request.user or not request.user.is_authenticated:
        raise ApiError('Войдите, чтобы продолжить', 401, 'unauthorized')


class LoginView(Throttled):
    def post(self, request):
        data = LoginIn(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(request._request, username=data.validated_data['email'].strip().lower(), password=data.validated_data['password'])
        if user is None or not user.is_active:
            raise ApiError('Неверная почта или пароль')
        login(request._request, user)
        return Response(user_json(user))


class SignupView(Throttled):
    @transaction.atomic
    def post(self, request):
        data = SignupIn(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        email = v['email'].strip().lower()
        if User.objects.filter(email=email).exists():
            raise ApiError('Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.', 409, 'exists')
        try:
            validate_password(v['password'])
        except DjangoValidationError as error:
            raise ApiError(error.messages[0])
        name = v['name'].strip()
        if not name:
            raise ApiError('Укажите имя')
        try:
            with transaction.atomic():
                user = User.objects.create_user(email, v['password'], name=name, role=v['role'])
        except IntegrityError:
            if User.objects.filter(email=email).exists():
                raise ApiError('Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.', 409, 'exists')
            raise
        if user.role == 'tutor':
            from tutors.services import create_draft_profile
            create_draft_profile(user)
        send_verification(user, EmailToken.issue(user, EmailToken.VERIFY, 24))
        login(request._request, user)
        return Response(user_json(user), status=201)


class LogoutView(PublicAPIView):
    def post(self, request):
        logout(request._request)
        return Response(status=204)


class YandexView(PublicAPIView):
    def post(self, request):
        if not (settings.YANDEX_CLIENT_ID and settings.YANDEX_CLIENT_SECRET):
            raise ApiError('Вход через Яндекс ID пока не настроен', 501, 'not_configured')
        raise ApiError('Вход через Яндекс ID включается после выдачи ключей', 501, 'not_configured')


class PasswordResetView(Throttled):
    def post(self, request):
        parsed = EmailIn(data=request.data)
        parsed.is_valid(raise_exception=True)
        email = parsed.validated_data['email'].lower()
        ensure_mail_available()
        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            send_reset(user, EmailToken.issue(user, EmailToken.RESET, 2))
        return Response(status=204)  # одинаковый ответ, чтобы не раскрывать, есть ли такой адрес


class PasswordResetConfirmView(Throttled):
    @transaction.atomic
    def post(self, request):
        parsed = ResetConfirmIn(data=request.data)
        parsed.is_valid(raise_exception=True)
        token, password = parsed.validated_data['token'], parsed.validated_data['password']
        try:
            validate_password(password)
        except DjangoValidationError as error:
            raise ApiError(error.messages[0])
        item = EmailToken.consume(token, EmailToken.RESET)
        if not item:
            raise ApiError('Ссылка устарела. Запросите письмо ещё раз.', 400, 'token')
        item.user.set_password(password)
        item.user.save(update_fields=['password'])
        record(item.user, 'account.password_reset', item.user.pk)
        return Response(status=204)


class ResendVerificationView(Throttled):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        _require(request)
        if not request.user.email_verified:
            send_verification(request.user, EmailToken.issue(request.user, EmailToken.VERIFY, 24))
        return Response(status=204)


class VerifyEmailView(Throttled):
    @transaction.atomic
    def post(self, request):
        parsed = TokenIn(data=request.data)
        parsed.is_valid(raise_exception=True)
        item = EmailToken.consume(parsed.validated_data['token'], EmailToken.VERIFY)
        if not item:
            raise ApiError('Ссылка устарела. Запросите письмо ещё раз.', 400, 'token')
        item.user.email_verified = True
        item.user.save(update_fields=['email_verified'])
        return Response(user_json(item.user))


class OnboardingView(APIView):
    def post(self, request):
        _require(request)
        data = OnboardingIn(data=request.data)
        data.is_valid(raise_exception=True)
        request.user.onboarding = data.validated_data
        request.user.onboarded = True
        request.user.save(update_fields=['onboarding', 'onboarded'])
        return Response(user_json(request.user))
