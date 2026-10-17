from django.conf import settings
from django.db import models

from core.ids import ShortIdField


class Card(models.Model):
    id = ShortIdField('card')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cards')
    brand = models.CharField(max_length=20)
    last4 = models.CharField(max_length=4)
    primary = models.BooleanField(default=False)
    provider_token = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class PaymentRecord(models.Model):
    KINDS = [('hold', 'hold'), ('charge', 'charge'), ('refund', 'refund'), ('release', 'release')]
    id = ShortIdField('p')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    lesson = models.ForeignKey('lessons.Lesson', on_delete=models.CASCADE, related_name='payment_records')
    title = models.CharField(max_length=200)
    amount = models.PositiveIntegerField()
    kind = models.CharField(max_length=10, choices=KINDS)
    card_last4 = models.CharField(max_length=4, blank=True)
    provider_ref = models.CharField(max_length=100, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']


class PayoutSettings(models.Model):
    tutor = models.OneToOneField('tutors.Tutor', on_delete=models.CASCADE, related_name='payout')
    inn = models.CharField(max_length=12, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_token = models.CharField(max_length=200, blank=True)
    self_employed_confirmed = models.BooleanField(default=False)
