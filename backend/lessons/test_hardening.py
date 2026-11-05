from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor

import pytest
from django.core.management import call_command
from django.db import close_old_connections, connection
from django.utils import timezone

from accounts.models import User
from conftest import Api
from lessons.models import Lesson
from lessons.services import create_booking
from requests_board.models import StudyRequest, RequestResponse
from services.slots import slots_for
from tutors.models import Tutor


@pytest.fixture
def booking(db):
    call_command('seed_demo', verbosity=0)
    tutor = Tutor.objects.get(pk='english')
    Lesson.objects.filter(tutor=tutor).update(status='cancelled')
    tutor.timezone = 'UTC'
    tutor.week = [{'weekday': d, 'intervals': [{'from': '10:30', 'to': '14:30'}]} for d in range(1, 8)]
    tutor.durations = [30, 60, 90, 120]
    tutor.save()
    start = (timezone.now() + timedelta(days=5)).replace(hour=11, minute=30, second=0, microsecond=0)
    return tutor, {'tutorId': tutor.pk, 'kind': 'regular', 'subject': tutor.subjects[0], 'start': start, 'durationMin': 90}


@pytest.mark.parametrize('duration', [30, 60, 90, 120])
def test_slots_validate_minutes_and_entire_duration(booking, duration):
    tutor, data = booking
    slots = slots_for(tutor, data['start'], 1, busy=[], duration_min=duration)
    assert slots and all(s['start'].minute == 30 for s in slots)
    assert all(s['start'] + timedelta(minutes=duration) <= data['start'].replace(hour=14) for s in slots)


def test_long_booking_rejects_later_conflict_and_boundary(booking):
    tutor, data = booking
    user = User.objects.get(email='olga@mail.ru')
    Lesson.objects.create(tutor=tutor, student=user, kind='regular', start=data['start'] + timedelta(hours=1), duration_min=60)
    client = Api()
    client.login_as(user.email)
    assert client.call('post', '/bookings', {**data, 'start': data['start'].isoformat()}).status_code == 409
    assert client.call('post', '/bookings', {**data, 'start': data['start'].replace(hour=13).isoformat(), 'durationMin': 120}).status_code == 409


def test_idempotency_checks_payload_and_replays(booking):
    _, data = booking
    client = Api()
    client.login_as('olga@mail.ru')
    payload = {**data, 'start': data['start'].isoformat()}
    first = client.call('post', '/bookings', payload, HTTP_IDEMPOTENCY_KEY='retry-key')
    assert first.status_code == 201
    assert client.call('post', '/bookings', payload, HTTP_IDEMPOTENCY_KEY='retry-key').json()['id'] == first.json()['id']
    assert client.call('post', '/bookings', {**payload, 'durationMin': 60}, HTTP_IDEMPOTENCY_KEY='retry-key').status_code == 409
    assert Lesson.objects.filter(idempotency_key='retry-key').count() == 1


def test_agreed_price_survives_tutor_price_change(booking):
    tutor, data = booking
    user = User.objects.get(email='olga@mail.ru')
    req = StudyRequest.objects.create(student=user, subject='English', expires_at=timezone.now() + timedelta(days=10))
    RequestResponse.objects.create(request=req, tutor=tutor, price=2200, tutor_price=2000, message='Hello')
    tutor.price = 4000
    tutor.save()
    lesson = create_booking(user, {**data, 'requestId': req.pk}, 'agreed')
    assert (lesson.price, lesson.tutor_price) == (3300, 3000)


def test_move_rechecks_full_duration(booking):
    _, data = booking
    user = User.objects.get(email='olga@mail.ru')
    lesson = create_booking(user, data, 'move')
    client = Api()
    client.login_as(user.email)
    assert client.call('post', f'/lessons/{lesson.pk}/move', {'start': (data['start'] + timedelta(days=1)).replace(hour=13, minute=30).isoformat()}).status_code == 409


@pytest.mark.django_db(transaction=True)
def test_concurrent_retries_use_one_booking():
    if connection.vendor != 'postgresql':
        pytest.skip('PostgreSQL row-lock test runs in Backend CI')
    call_command('seed_demo', verbosity=0)
    tutor = Tutor.objects.get(pk='english')
    Lesson.objects.filter(tutor=tutor).update(status='cancelled')
    tutor.timezone = 'UTC'
    tutor.week = [{'weekday': d, 'intervals': [{'from': '10:00', 'to': '18:00'}]} for d in range(1, 8)]
    tutor.save()
    data = {'tutorId': tutor.pk, 'kind': 'regular', 'subject': tutor.subjects[0], 'start': (timezone.now() + timedelta(days=5)).replace(hour=12, minute=0, second=0, microsecond=0), 'durationMin': 60}

    def book():
        close_old_connections()
        try:
            return create_booking(User.objects.get(email='olga@mail.ru'), data, 'parallel-key').pk
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(lambda _: book(), range(2)))
    assert ids[0] == ids[1]
    assert Lesson.objects.filter(idempotency_key='parallel-key').count() == 1
