from django.conf import settings
from django.db import models


class RateLimitBucket(models.Model):
    """Shared across processes; identifiers are HMAC digests, never raw IP/email."""
    key = models.CharField(max_length=64, primary_key=True)
    hits = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(db_index=True)


class SecurityEvent(models.Model):
    """Application append-only audit trail. No credentials, message bodies or card data."""
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)
    object_id = models.CharField(max_length=100, blank=True)
    outcome = models.CharField(max_length=32, blank=True)
    at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-at', '-pk']
