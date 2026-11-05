import hashlib
import hmac
import time
from datetime import datetime, timezone

from django.conf import settings
from django.db.models import F
from rest_framework.throttling import BaseThrottle, SimpleRateThrottle

from .models import RateLimitBucket
from .client_ip import client_ip


class DatabaseRateThrottle(BaseThrottle):
    """Atomic fixed-window limits in the shared DB. Ignore untrusted forwarding headers."""
    def allow_request(self, request, view):
        ip = client_ip(request)
        authenticated = bool(request.user and request.user.is_authenticated)
        checks = [('user', str(request.user.pk))] if authenticated else [('anon', ip)]
        scope = getattr(view, 'throttle_scope', None)
        if request.content_type == 'multipart/form-data' and scope != 'upload':
            checks.append(('upload', ip))
        if scope:
            checks.append((scope, ip))
            if authenticated:
                checks.append((scope, 'user:' + str(request.user.pk)))
        now = time.time()
        for name, identity in checks:
            rate = settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'][name]
            limit, duration = SimpleRateThrottle.parse_rate(self, rate)
            window = int(now // duration)
            self.retry_after = max(1, (window + 1) * duration - now)
            digest = hmac.new(settings.SECRET_KEY.encode(), f'{name}:{identity}:{window}'.encode(), hashlib.sha256).hexdigest()
            RateLimitBucket.objects.get_or_create(key=digest, defaults={'expires_at': datetime.fromtimestamp((window + 1) * duration, timezone.utc)})
            if not RateLimitBucket.objects.filter(pk=digest, hits__lt=limit).update(hits=F('hits') + 1):
                return False
        return True

    def wait(self):
        return self.retry_after
