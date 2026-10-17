from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from conftest import Api
from lessons import jobs
from lessons.models import Lesson
from payments.models import PaymentRecord

HOUR = timedelta(hours=1)


@pytest.fixture
def demo(db):
    call_command('seed_demo', verbosity=0)


@pytest.fixture
def olga(demo):
    api = Api()
    api.login_as('olga@mail.ru')
    return api


@pytest.fixture
def anastasia(demo):
    api = Api()
    api.login_as('anastasia@toprepet.ru')
    return api


def free_slot(api, tutor='english', skip=0, lead_hours=6):
    slots = api.get_ok(f'/tutors/{tutor}/slots', {'from': (timezone.now() + timedelta(hours=lead_hours)).isoformat(), 'days': 14})
    free = [s for s in slots if s['available']]
    return free[skip]['start']


def book(api, start, tutor='english', kind='regular', **extra):
    return api.call('post', '/bookings', {'tutorId': tutor, 'kind': kind, 'subject': 'Английский', 'start': start, 'durationMin': 60, **extra})


def test_booking_holds_money_and_hides_the_fee_from_the_student(olga):
    response = book(olga, free_slot(olga))
    assert response.status_code == 201
    lesson = response.json()
    assert lesson['status'] == 'pending' and lesson['payment'] == 'hold' and lesson['price'] == 1320
    assert lesson['tutorPrice'] == 1320  # ученик не видит цену репетитора
    assert 'confirmBy' in lesson
    assert PaymentRecord.objects.filter(lesson_id=lesson['id'], kind='hold', amount=1320).exists()


def test_tutor_sees_only_his_own_price(olga, anastasia):
    lesson = book(olga, free_slot(olga)).json()
    seen = anastasia.get_ok(f'/lessons/{lesson["id"]}')
    assert seen['price'] == 1200 and seen['tutorPrice'] == 1200


def test_same_slot_cannot_be_booked_twice(olga):
    start = free_slot(olga)
    assert book(olga, start).status_code == 201
    second = book(olga, start)
    assert second.status_code == 409 and 'занято' in second.json()['message']


def test_booking_is_idempotent_with_key(olga):
    start = free_slot(olga)
    first = olga.call('post', '/bookings', {'tutorId': 'english', 'kind': 'regular', 'subject': 'Английский', 'start': start, 'durationMin': 60}, HTTP_IDEMPOTENCY_KEY='abc123')
    again = olga.call('post', '/bookings', {'tutorId': 'english', 'kind': 'regular', 'subject': 'Английский', 'start': start, 'durationMin': 60}, HTTP_IDEMPOTENCY_KEY='abc123')
    assert first.json()['id'] == again.json()['id']
    assert Lesson.objects.filter(idempotency_key='abc123').count() == 1


def test_paid_lesson_needs_a_card_and_declined_card_is_reported(olga):
    olga.call('delete', '/me/cards/card-1', status=204)
    assert book(olga, free_slot(olga)).status_code == 402
    card = olga.post_ok('/me/cards', {'number': '2200 0000 0000 0119', 'expiry': '12/30', 'cvc': '123'}, 201)
    assert card['primary'] is True
    declined = book(olga, free_slot(olga))
    assert declined.status_code == 402 and 'отклонил' in declined.json()['message']
    assert Lesson.objects.filter(student__email='olga@mail.ru', start__gt=timezone.now() + 5 * HOUR, status='pending').count() == 1  # только демо-урок l-2


def test_free_intro_is_one_per_pair_and_uses_tutor_duration(olga):
    tutor = olga.get_ok('/tutors/chemistry-biology')
    assert tutor['introMinutes'] > 0
    first = book(olga, free_slot(olga, 'chemistry-biology'), 'chemistry-biology', 'intro')
    assert first.status_code == 201
    lesson = first.json()
    assert lesson['payment'] == 'none' and lesson['price'] == 0 and lesson['durationMin'] == tutor['introMinutes']
    again = book(olga, free_slot(olga, 'chemistry-biology', 4), 'chemistry-biology', 'intro')
    assert again.status_code == 409 and 'уже было' in again.json()['message']
    assert not PaymentRecord.objects.filter(lesson_id=lesson['id']).exists()


def test_cancel_free_until_four_hours_then_money_stays(olga, demo):
    free = olga.post_ok(f'/lessons/{book(olga, free_slot(olga)).json()["id"]}/cancel', {'reason': 'Не получается'})
    assert free['status'] == 'cancelled' and free['payment'] == 'refunded'
    Lesson.objects.filter(id='l-1').update(start=timezone.now() + 3 * HOUR)
    late = olga.post_ok('/lessons/l-1/cancel', {'reason': 'Заболела'})
    assert late['payment'] == 'captured'
    assert olga.call('post', '/lessons/l-1/cancel', {'reason': 'ещё раз'}).status_code == 400


def test_tutor_cancel_always_refunds(olga, anastasia):
    Lesson.objects.filter(id='l-1').update(start=timezone.now() + HOUR)
    cancelled = anastasia.post_ok('/lessons/l-1/cancel', {'reason': 'Заболела'})
    assert cancelled['payment'] == 'refunded' and cancelled['cancelledBy'] == 'tutor'
    assert PaymentRecord.objects.filter(lesson_id='l-1', kind='refund').exists()


def test_confirm_captures_and_decline_releases(olga, anastasia):
    pending = book(olga, free_slot(olga)).json()['id']
    confirmed = anastasia.post_ok(f'/lessons/{pending}/confirm')
    assert confirmed['status'] == 'confirmed' and confirmed['payment'] == 'captured' and confirmed['meetingUrl']
    other = book(olga, free_slot(olga, skip=3)).json()['id']
    declined = anastasia.post_ok(f'/lessons/{other}/decline', {'reason': 'Занята'})
    assert declined['status'] == 'declined' and declined['payment'] == 'refunded'
    assert PaymentRecord.objects.filter(lesson_id=other, kind='release').exists()
    assert olga.call('post', f'/lessons/{other}/confirm').status_code == 403


def test_access_to_foreign_lessons_is_closed(olga, anastasia):
    stranger = Api()
    stranger.post_ok('/auth/signup', {'role': 'student', 'name': 'Пётр', 'email': 'petr.t@mail.ru', 'password': 'password1'}, 201)
    assert stranger.call('get', '/lessons/l-1').status_code == 404
    assert stranger.call('post', '/lessons/l-1/cancel', {'reason': 'x'}).status_code == 404
    other_tutor = Api()
    other_tutor.login_as('anastasia@toprepet.ru')
    assert other_tutor.call('get', '/lessons/l-3').status_code == 404  # урок к другому репетитору


def test_unconfirmed_lessons_expire_and_money_is_released(olga):
    lesson = book(olga, free_slot(olga)).json()['id']
    Lesson.objects.filter(id=lesson).update(confirm_by=timezone.now() - HOUR)
    assert jobs.run_all()['expired_lessons'] >= 1
    seen = olga.get_ok(f'/lessons/{lesson}')
    assert seen['status'] == 'expired' and seen['payment'] == 'refunded'


def test_move_needs_free_slot_and_other_side_answer(olga, anastasia):
    new_start = free_slot(olga, skip=6)
    proposed = olga.post_ok('/lessons/l-1/move', {'start': new_start})
    assert proposed['moveProposal'] == {'start': new_start, 'by': 'student'}
    assert olga.call('post', '/lessons/l-1/move/answer', {'accept': True}).status_code == 403
    answered = anastasia.post_ok('/lessons/l-1/move/answer', {'accept': True})
    assert answered['start'] == new_start and answered['moveProposal'] is None
    assert olga.call('post', '/lessons/l-1/move', {'start': timezone.now().isoformat()}).status_code == 409


def test_result_marking_rules(olga, anastasia):
    assert anastasia.call('post', '/lessons/l-1/result', {'result': 'happened'}).status_code == 400  # ещё не начался
    Lesson.objects.filter(id='l-1').update(start=timezone.now() - 2 * HOUR)
    assert olga.call('post', '/lessons/l-1/result', {'result': 'happened'}).status_code == 403
    assert anastasia.post_ok('/lessons/l-1/result', {'result': 'happened'})['status'] == 'completed'
    Lesson.objects.filter(id='l-3').update(start=timezone.now() - 2 * HOUR)
    refunded = olga.post_ok('/lessons/l-3/result', {'result': 'no_show_tutor'})
    assert refunded['status'] == 'no_show_tutor'


def test_problem_dispute_flow_refund_and_pay(olga, anastasia):
    assert olga.call('post', '/lessons/l-5/problem', {'reason': 'Не было связи', 'text': 'Давно было'}).status_code == 400
    dispute = olga.post_ok('/lessons/l-7/problem', {'reason': 'Репетитор не пришёл', 'text': 'Ждали двадцать минут.'}, 201)
    assert olga.get_ok('/lessons/l-7')['disputeId'] == dispute['id'] and olga.get_ok('/lessons/l-7')['status'] == 'disputed'
    assert olga.call('post', '/lessons/l-7/problem', {'reason': 'ещё', 'text': 'ещё раз'}).status_code == 409
    assert olga.call('post', f'/disputes/{dispute["id"]}/reply', {'text': 'Я не ученик, отвечать не могу'}).status_code == 403
    replied = anastasia.post_ok(f'/disputes/{dispute["id"]}/reply', {'text': 'Я была на связи, ученик не подключился.'})
    assert replied['status'] == 'tutor_replied'
    admin = Api()
    admin.login_as('admin@toprepet.ru')
    assert olga.call('post', f'/admin/disputes/{dispute["id"]}/resolve', {'outcome': 'refund'}).status_code == 403
    resolved = admin.post_ok(f'/admin/disputes/{dispute["id"]}/resolve', {'outcome': 'refund'})
    assert resolved['status'] == 'resolved_refund'
    assert olga.get_ok('/lessons/l-7')['payment'] == 'refunded'
    assert any(n['title'] == 'Спор решён' for n in olga.get_ok('/me/notifications'))


def test_payout_waits_for_tutor_requisites(olga, anastasia):
    Lesson.objects.filter(id='l-1').update(start=timezone.now() - 3 * 24 * HOUR, status='completed')
    assert jobs.run_all()['payouts'] == 0 and Lesson.objects.get(id='l-1').payment == 'captured'
    assert anastasia.get_ok('/tutor/finance')['available'] == 1200 + 1200  # l-1 и l-7 ждут выплаты
    bad = anastasia.call('put', '/tutor/payout', {'inn': '123', 'cardNumber': '2200 0000 0000 1111'})
    assert bad.status_code == 400
    ok = anastasia.call('put', '/tutor/payout', {'inn': '123456789012', 'cardNumber': '2200 0000 0000 1111'}, 200).json()
    assert ok == {'inn': '123456789012', 'cardLast4': '1111', 'selfEmployedConfirmed': True}
    assert jobs.run_all()['payouts'] >= 1
    assert Lesson.objects.get(id='l-1').payment == 'paid_out'
    assert anastasia.get_ok('/tutor/finance')['paidThisMonth'] >= 1200


def test_lists_students_and_tutors_and_lesson_scopes(olga, anastasia):
    upcoming = olga.get_ok('/me/lessons', {'scope': 'upcoming'})
    past = olga.get_ok('/me/lessons', {'scope': 'past'})
    assert [l['id'] for l in upcoming] == ['l-1', 'l-2', 'l-3']
    assert {l['id'] for l in past} == {'l-4', 'l-5', 'l-6', 'l-7'}
    assert anastasia.get_ok('/tutor/students')[0]['name'] == 'Ольга'
    assert olga.get_ok('/me/tutors')[0]['name'] in ('Анастасия', 'Ерлан', 'Анна')
    assert olga.call('get', '/tutor/students').status_code == 403
