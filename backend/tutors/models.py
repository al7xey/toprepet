from django.conf import settings
from django.db import models

from core.ids import ShortIdField


def student_price(price: int) -> int:
    """Цена для ученика = цена репетитора + 10 %, округление «от половины вверх» (как Math.round во фронтенде)."""
    return (price * 11 + 5) // 10


class Tutor(models.Model):
    STATUSES = [('draft', 'Черновик'), ('review', 'На проверке'), ('published', 'Опубликована'), ('hidden', 'Скрыта')]

    id = ShortIdField('t')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='tutor')
    name = models.CharField(max_length=120)
    photo = models.CharField(max_length=500, blank=True)
    photo_srcset = models.TextField(blank=True)
    headline = models.CharField(max_length=200, blank=True)
    subjects = models.JSONField(default=list)
    card_subjects = models.CharField(max_length=200, blank=True)
    help_topics = models.JSONField(default=list)
    experience = models.CharField(max_length=200, blank=True)
    intro = models.TextField(blank=True)
    approach = models.TextField(blank=True)
    achievements = models.JSONField(default=list)
    levels = models.JSONField(default=list)
    price = models.PositiveIntegerField(default=0)
    intro_minutes = models.PositiveIntegerField(default=0)
    durations = models.JSONField(default=list)
    status = models.CharField(max_length=10, choices=STATUSES, default='draft')
    moderation_note = models.TextField(blank=True)
    timezone = models.CharField(max_length=64, default='Europe/Moscow')
    week = models.JSONField(default=list)
    rating = models.DecimalField(max_digits=2, decimal_places=1, null=True, blank=True)
    reviews_count = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=1000)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'created_at']

    @property
    def student_price(self) -> int:
        return student_price(self.price)


class ScheduleException(models.Model):
    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, related_name='exceptions')
    date = models.DateField()
    kind = models.CharField(max_length=5, choices=[('off', 'off'), ('extra', 'extra')])
    intervals = models.JSONField(default=list)

    class Meta:
        unique_together = [('tutor', 'date')]
        ordering = ['date']


class TutorDocument(models.Model):
    id = ShortIdField('d')
    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/', null=True, blank=True)
    status = models.CharField(max_length=10, default='checking')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
