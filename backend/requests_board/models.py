from django.conf import settings
from django.db import models

from core.ids import ShortIdField


class StudyRequest(models.Model):
    id = ShortIdField('r')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_requests')
    subject = models.CharField(max_length=120)
    subjects = models.JSONField(default=list, blank=True)
    custom_subject = models.CharField(max_length=120, blank=True)
    goal = models.CharField(max_length=200)
    level = models.CharField(max_length=120, blank=True)
    budget_min = models.PositiveIntegerField(null=True, blank=True)
    budget_max = models.PositiveIntegerField(null=True, blank=True)
    schedule = models.JSONField(default=list)
    description = models.TextField()
    status = models.CharField(max_length=10, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']


class RequestResponse(models.Model):
    id = ShortIdField('rr')
    request = models.ForeignKey(StudyRequest, on_delete=models.CASCADE, related_name='responses')
    tutor = models.ForeignKey('tutors.Tutor', on_delete=models.CASCADE, related_name='responses')
    price = models.PositiveIntegerField()
    message = models.TextField()
    slots = models.JSONField(default=list)
    status = models.CharField(max_length=10, default='sent')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('request', 'tutor')]
        ordering = ['created_at']
