from django.conf import settings
from django.db import models

from core.ids import ShortIdField


class Lesson(models.Model):
    KINDS = [('intro', 'Знакомство'), ('regular', 'Урок')]
    ACTIVE = ('pending', 'confirmed')

    id = ShortIdField('l')
    kind = models.CharField(max_length=7, choices=KINDS)
    tutor = models.ForeignKey('tutors.Tutor', on_delete=models.PROTECT, related_name='lessons')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='lessons')
    subject = models.CharField(max_length=120)
    start = models.DateTimeField()
    duration_min = models.PositiveIntegerField()
    status = models.CharField(max_length=20, default='pending')
    price = models.PositiveIntegerField(default=0)
    tutor_price = models.PositiveIntegerField(default=0)
    payment = models.CharField(max_length=10, default='none')
    confirm_by = models.DateTimeField(null=True, blank=True)
    meeting_url = models.CharField(max_length=300, blank=True)
    cancel_reason = models.TextField(blank=True)
    cancelled_by = models.CharField(max_length=10, blank=True)
    decline_reason = models.TextField(blank=True)
    move_start = models.DateTimeField(null=True, blank=True)
    move_by = models.CharField(max_length=10, blank=True)
    series_id = models.CharField(max_length=40, blank=True)
    request = models.ForeignKey('requests_board.StudyRequest', null=True, blank=True, on_delete=models.SET_NULL, related_name='lessons')
    idempotency_key = models.CharField(max_length=64, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start']
        indexes = [models.Index(fields=['tutor', 'start']), models.Index(fields=['student', 'start'])]

    @property
    def end(self):
        from datetime import timedelta
        return self.start + timedelta(minutes=self.duration_min)


class Dispute(models.Model):
    id = ShortIdField('dp')
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='dispute')
    reason = models.CharField(max_length=200)
    text = models.TextField()
    status = models.CharField(max_length=20, default='open')
    tutor_reply = models.TextField(blank=True)
    resolution = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
