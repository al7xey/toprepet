"""Regression cases found during the design/home-mockup audit."""
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.utils import timezone

from conftest import Api
from lessons import jobs
from lessons.models import Lesson
from payments.models import PaymentRecord


@pytest.fixture
def student(db):
    call_command('seed_demo', verbosity=0)
    client = Api()
    client.login_as('olga@mail.ru')
    return client


def test_hold_history_uses_selected_card(student):
    card = student.post_ok('/me/cards', {'number': '2200000000002222', 'expiry': '12/30', 'cvc': '123'}, 201)
    slots = student.get_ok('/tutors/english/slots', {'days': 14})
    start = next(s['start'] for s in slots if s['available'])
    lesson = student.post_ok('/bookings', {'tutorId': 'english', 'kind': 'regular', 'subject': 'Английский', 'start': start, 'durationMin': 60, 'cardId': card['id']}, 201)
    assert PaymentRecord.objects.get(lesson_id=lesson['id'], kind='hold').card_last4 == '2222'
    student.call('delete', f'/me/cards/{card["id"]}', status=204)
    tutor = Api()
    tutor.login_as('anastasia@toprepet.ru')
    tutor.post_ok(f'/lessons/{lesson["id"]}/confirm')
    assert PaymentRecord.objects.get(lesson_id=lesson['id'], kind='charge').card_last4 == '2222'


def test_finance_excludes_refunded_lessons(student):
    tutor = Api()
    tutor.login_as('anastasia@toprepet.ru')
    before = tutor.get_ok('/tutor/finance')['pending']
    lesson = Lesson.objects.get(id='l-1')
    student.post_ok('/lessons/l-1/cancel', {'reason': 'Отмена заранее'})
    after = tutor.get_ok('/tutor/finance')
    assert after['pending'] == before - lesson.tutor_price
    assert not any(e['id'] == 'l-1' for e in after['entries'])


def test_stale_payout_candidate_is_rechecked(student):
    Lesson.objects.filter(id='l-1').update(status='completed', start=timezone.now() - timedelta(days=3))
    original = jobs.payable
    changed = False

    def refund_after_read(lesson, *args):
        nonlocal changed
        result = original(lesson, *args)
        if lesson.id == 'l-1' and not changed:
            changed = True
            Lesson.objects.filter(pk=lesson.pk).update(payment='refunded')
        return result

    with patch.object(jobs, 'payable', side_effect=refund_after_read), patch.object(jobs.money, 'payout', return_value=True) as payout:
        jobs.pay_out(timezone.now())
    assert all(call.args[0].id != 'l-1' for call in payout.call_args_list)
    assert Lesson.objects.get(pk='l-1').payment == 'refunded'


def test_stale_auto_complete_does_not_overwrite_dispute(student):
    Lesson.objects.filter(id='l-1').update(status='confirmed', start=timezone.now() - timedelta(days=3))
    original_end = Lesson.end.fget
    changed = False

    def concurrent_dispute(lesson):
        nonlocal changed
        if lesson.id == 'l-1' and not changed:
            changed = True
            Lesson.objects.filter(pk=lesson.pk).update(status='disputed')
        return original_end(lesson)

    with patch.object(Lesson, 'end', property(concurrent_dispute)):
        jobs.auto_complete(timezone.now())
    assert Lesson.objects.get(pk='l-1').status == 'disputed'
