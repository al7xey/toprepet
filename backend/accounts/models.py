import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone as djtz

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
    """Одноразовая ссылка из письма: подтверждение почты и сброс пароля. В базе хранится только хеш токена."""

    VERIFY, RESET = 'verify', 'reset'
    id = ShortIdField('tok')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tokens')
    kind = models.CharField(max_length=10)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def issue(cls, user: User, kind: str, hours: int) -> str:
        cls.objects.filter(user=user, kind=kind, used_at__isnull=True).update(used_at=djtz.now())
        token = secrets.token_urlsafe(32)
        cls.objects.create(user=user, kind=kind, token_hash=cls.digest(token), expires_at=djtz.now() + timedelta(hours=hours))
        return token

    @classmethod
    def consume(cls, token: str, kind: str):
        item = cls.objects.filter(token_hash=cls.digest(token), kind=kind, used_at__isnull=True, expires_at__gt=djtz.now()).select_related('user').first()
        if item:
            item.used_at = djtz.now()
            item.save(update_fields=['used_at'])
        return item
