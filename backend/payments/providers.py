"""Платёжный слой. Сейчас работает заглушка FakeProvider; настоящий провайдер подключается заменой класса (PAYMENT_PROVIDER)."""
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass

from django.conf import settings

from core.errors import ApiError


@dataclass
class CardToken:
    brand: str
    last4: str
    token: str


class PaymentProvider:
    """Что нужно от провайдера. Деньги ученика сначала замораживаются (hold), после подтверждения репетитором списываются (capture),
    при отказе освобождаются (cancel_hold) или возвращаются (refund). Репетитору (самозанятому) деньги уходят выплатой (payout)."""

    def tokenize_card(self, number: str, expiry: str, cvc: str) -> CardToken: raise NotImplementedError
    def hold(self, card_token: str, amount: int, reference: str) -> str: raise NotImplementedError
    def capture(self, hold_ref: str, amount: int) -> None: raise NotImplementedError
    def cancel_hold(self, hold_ref: str) -> None: raise NotImplementedError
    def refund(self, hold_ref: str, amount: int) -> None: raise NotImplementedError
    def payout(self, payout_token: str, amount: int, reference: str) -> str: raise NotImplementedError


class FakeProvider(PaymentProvider):
    """Заглушка: ничего никуда не отправляет. Номер, оканчивающийся на 0119, имитирует отказ банка при заморозке."""

    DECLINE_SUFFIX = '0119'

    def tokenize_card(self, number, expiry, cvc):
        digits = re.sub(r'\D', '', number)
        if len(digits) < 16:
            raise ApiError('Проверьте номер карты')
        brand = 'МИР' if digits.startswith('2') else 'Visa' if digits.startswith('4') else 'Карта'
        return CardToken(brand=brand, last4=digits[-4:], token=f'fake_{digits[-4:]}_{secrets.token_hex(4)}')

    def hold(self, card_token, amount, reference):
        if card_token.startswith(f'fake_{self.DECLINE_SUFFIX}'):
            raise ApiError('Банк отклонил операцию. Попробуйте другую карту.', 402, 'card_declined')
        return f'hold_{secrets.token_hex(6)}'

    def capture(self, hold_ref, amount): return None
    def cancel_hold(self, hold_ref): return None
    def refund(self, hold_ref, amount): return None
    def payout(self, payout_token, amount, reference): return f'payout_{secrets.token_hex(6)}'


class YooKassaProvider(PaymentProvider):
    """Заготовка под ЮKassa (платежи в два этапа, возвраты, выплаты самозанятым). Подключается после получения ключей:
    YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY, виджет вместо ввода номера карты, вебхуки payment.succeeded / payment.canceled / refund.succeeded."""


_provider: PaymentProvider | None = None


def get_provider() -> PaymentProvider:
    global _provider
    if _provider is None:
        name = settings.PAYMENT_PROVIDER
        if name == 'fake':
            _provider = FakeProvider()
        else:
            raise ApiError('Платёжный провайдер не настроен', 503, 'payments_unavailable')
    return _provider
