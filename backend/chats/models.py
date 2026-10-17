from django.conf import settings
from django.db import models

from core.ids import ShortIdField


class Conversation(models.Model):
    id = ShortIdField('c')
    tutor = models.ForeignKey('tutors.Tutor', on_delete=models.CASCADE, related_name='conversations')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    last_message = models.CharField(max_length=300, blank=True)
    updated_at = models.DateTimeField(auto_now_add=True)
    unread_student = models.PositiveIntegerField(default=0)
    unread_tutor = models.PositiveIntegerField(default=0)
    blocked = models.BooleanField(default=False)
    reports = models.JSONField(default=list)

    class Meta:
        unique_together = [('tutor', 'student')]
        ordering = ['-updated_at']


class Message(models.Model):
    id = ShortIdField('m')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=6, default='text')
    text = models.TextField()
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['at', 'id']
