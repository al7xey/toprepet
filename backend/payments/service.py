"""Движение денег по уроку: заморозка → списание → выплата либо возврат. Каждая операция пишется в историю ученика."""
from django.db import transaction
from django.utils import timezone

from .models import Card, PaymentRecord
from .providers import get_provider


def _record(lesson, kind: str, ref: str = ''):
    if lesson.price == 0:
        return None
    card = lesson.student.cards.filter(primary=True).first() or lesson.student.cards.first()
    title = f'{"Знакомство" if lesson.kind == "intro" else "Урок"} с {lesson.tutor.name}'
    return PaymentRecord.objects.create(user=lesson.student, lesson=lesson, title=title, amount=lesson.price, kind=kind, card_last4=card.last4 if card else '', provider_ref=ref)


def _hold_ref(lesson) -> str:
    record = lesson.payment_records.filter(kind='hold').first()
    return record.provider_ref if record else ''


def hold(lesson, card: Card | None):
    """Заморозить сумму урока. Для бесплатного знакомства ничего не делаем."""
    if lesson.price == 0:
        lesson.payment = 'none'
        return
    if card is None:
        from core.errors import ApiError
        raise ApiError('Добавьте карту, чтобы записаться', 402, 'card_required')
    ref = get_provider().hold(card.provider_token, lesson.price, lesson.id)
    lesson.payment = 'hold'
    _record(lesson, 'hold', ref)


def capture(lesson):
    if lesson.price == 0:
        return
    get_provider().capture(_hold_ref(lesson), lesson.price)
    lesson.payment = 'captured'
    _record(lesson, 'charge', _hold_ref(lesson))


def release(lesson):
    """Снять заморозку (репетитор отказал или не ответил): деньги ученика не списывались."""
    if lesson.price == 0:
        lesson.payment = 'none'
        return
    get_provider().cancel_hold(_hold_ref(lesson))
    lesson.payment = 'refunded'
    _record(lesson, 'release', _hold_ref(lesson))


def refund(lesson):
    """Вернуть уже списанные деньги ученику."""
    if lesson.price == 0:
        lesson.payment = 'none'
        return
    if lesson.payment == 'hold':
        return release(lesson)
    get_provider().refund(_hold_ref(lesson), lesson.price)
    lesson.payment = 'refunded'
    _record(lesson, 'refund', _hold_ref(lesson))


def payout(lesson) -> bool:
    """Выплатить репетитору его часть. Без подтверждённых реквизитов самозанятого выплата ждёт."""
    payout_settings = getattr(lesson.tutor, 'payout', None)
    if lesson.tutor_price == 0:
        return False
    if payout_settings is None or not payout_settings.self_employed_confirmed:
        return False
    get_provider().payout(payout_settings.card_token, lesson.tutor_price, lesson.id)
    lesson.payment = 'paid_out'
    lesson.paid_out_at = timezone.now()
    return True
