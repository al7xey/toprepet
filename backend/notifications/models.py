from django.conf import settings
from django.db import models

from core.ids import ShortIdField


class Notification(models.Model):
    id = ShortIdField('n')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    kind = models.CharField(max_length=10)
    title = models.CharField(max_length=200)
    text = models.TextField(blank=True)
    link = models.CharField(max_length=200, null=True, blank=True)
    read = models.BooleanField(default=False)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']
