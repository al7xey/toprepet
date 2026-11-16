import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models, transaction
from django.utils import timezone as djtz
from django.utils.crypto import salted_hmac

from core.ids import ShortIdField


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        user = self.model(email=email.strip().lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('role', 'admin')
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLES = [('student', 'Ученик'), ('tutor', 'Репетитор'), ('admin', 'Администратор')]

    id = ShortIdField('u')
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=10, choices=ROLES, default='student')
    timezone = models.CharField(max_length=64, default='Europe/Moscow')
    email_verified = models.BooleanField(default=False)
    onboarded = models.BooleanField(default=False)
    photo = models.CharField(max_length=300, blank=True)
    notify_prefs = models.JSONField(default=dict, blank=True)
    onboarding = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=djtz.now)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def tutor_id(self):
        tutor = getattr(self, 'tutor', None)
        return tutor.id if tutor else None


class EmailToken(models.Model):
    """Код подтверждения почты или токен сброса пароля. В базе хранится только хеш."""

    VERIFY, RESET = 'verify', 'reset'
    id = ShortIdField('tok')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tokens')
    kind = models.CharField(max_length=10)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def code_digest(user, code):
        return salted_hmac('toprepet.verify-code', f'{user.pk}:{code}', algorithm='sha256').hexdigest()

    @classmethod
    @transaction.atomic
    def issue(cls, user: User, kind: str, hours: int) -> str:
        User.objects.select_for_update(no_key=True).get(pk=user.pk)
        cls.objects.filter(user=user, kind=kind, used_at__isnull=True).update(used_at=djtz.now())
        token = f'{secrets.randbelow(1000000):06d}' if kind == cls.VERIFY else secrets.token_urlsafe(32)
        hashed = cls.code_digest(user, token) if kind == cls.VERIFY else cls.digest(token)
        while cls.objects.filter(token_hash=hashed).exists():
            token = f'{secrets.randbelow(1000000):06d}' if kind == cls.VERIFY else secrets.token_urlsafe(32)
            hashed = cls.code_digest(user, token) if kind == cls.VERIFY else cls.digest(token)
        lifetime = timedelta(minutes=10) if kind == cls.VERIFY else timedelta(hours=hours)
        cls.objects.create(user=user, kind=kind, token_hash=hashed, expires_at=djtz.now() + lifetime)
        return token

    @classmethod
    @transaction.atomic
    def verify_code(cls, user, code):
        User.objects.select_for_update(no_key=True).get(pk=user.pk)
        item = cls.objects.filter(user=user, kind=cls.VERIFY, used_at__isnull=True, expires_at__gt=djtz.now()).order_by('-created_at').first()
        if not item or item.attempts >= 5:
            return None
        item.attempts += 1
        matches = secrets.compare_digest(item.token_hash, cls.code_digest(user, code))
        if matches or item.attempts >= 5:
            item.used_at = djtz.now()
        item.save(update_fields=['attempts', 'used_at'])
        if not matches:
            return None
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        return user

    @classmethod
    @transaction.atomic
    def consume(cls, token: str, kind: str):
        item = cls.objects.filter(token_hash=cls.digest(token), kind=kind, used_at__isnull=True, expires_at__gt=djtz.now()).select_related('user').first()
        if item:
            User.objects.select_for_update(no_key=True).get(pk=item.user_id)
        if item and cls.objects.filter(pk=item.pk, used_at__isnull=True, expires_at__gt=djtz.now()).update(used_at=djtz.now()):
            return item
        return None
