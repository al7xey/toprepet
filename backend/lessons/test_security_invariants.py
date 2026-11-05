from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.db import IntegrityError, connection, connections, transaction
from django.utils import timezone

from accounts.models import User
from conftest import Api
from lessons import jobs
from lessons.models import Lesson


@pytest.fixture
def demo(db):
    call_command('seed_demo', verbosity=0)


def test_auto_complete_cannot_complete_concurrently_moved_lesson(demo):
    Lesson.objects.filter(pk='l-1').update(status='confirmed', start=timezone.now() - timedelta(days=3))
    original = Lesson.end.fget
    moved = False
    def concurrent_move(lesson):
        nonlocal moved
        if lesson.pk == 'l-1' and not moved:
            moved = True
            Lesson.objects.filter(pk=lesson.pk).update(start=timezone.now() + timedelta(days=5))
        return original(lesson)
    with patch.object(Lesson, 'end', property(concurrent_move)):
        jobs.auto_complete(timezone.now())
    assert Lesson.objects.get(pk='l-1').status == 'confirmed'


def test_expiry_rechecks_changed_deadline_under_lock(demo):
    Lesson.objects.filter(pk='l-2').update(confirm_by=timezone.now() - timedelta(hours=1))
    original = Lesson.objects.select_for_update
    changed = False
    def refresh(*args, **kwargs):
        nonlocal changed
        if not changed:
            changed = True
            Lesson.objects.filter(pk='l-2').update(confirm_by=timezone.now() + timedelta(hours=1))
        return original(*args, **kwargs)
    with patch.object(Lesson.objects, 'select_for_update', side_effect=refresh):
        jobs.expire_unconfirmed(timezone.now())
    assert Lesson.objects.get(pk='l-2').status == 'pending'


def test_late_confirmation_rejected_before_capture(demo):
    Lesson.objects.filter(pk='l-2').update(confirm_by=timezone.now() - timedelta(seconds=1))
    tutor = Api()
    tutor.login_as('anastasia@toprepet.ru')
    with patch('payments.service.capture') as capture:
        response = tutor.call('post', '/lessons/l-2/confirm', {})
    assert response.status_code == 409
    capture.assert_not_called()
    assert Lesson.objects.get(pk='l-2').payment == 'hold'


@pytest.mark.parametrize('patch_data', [{'duration_min': 0}, {'duration_min': 241}, {'price': 1, 'tutor_price': 10}, {'status': 'forged'}, {'payment': 'forged'}])
def test_database_rejects_invalid_lesson_states(demo, patch_data):
    with pytest.raises(IntegrityError), transaction.atomic():
        Lesson.objects.filter(pk='l-1').update(**patch_data)


@pytest.mark.django_db(transaction=True)
def test_postgres_rejects_overlaps_even_without_booking_service():
    if connection.vendor != 'postgresql':
        pytest.skip('PostgreSQL exclusion constraint')
    call_command('seed_demo', verbosity=0)
    lesson = Lesson.objects.get(pk='l-1')
    with pytest.raises(IntegrityError), transaction.atomic():
        Lesson.objects.create(tutor=lesson.tutor, student=lesson.student, subject=lesson.subject, kind='regular', start=lesson.start + timedelta(minutes=30), duration_min=60, status='pending')
    # Adjacent half-open intervals are allowed.
    with transaction.atomic():
        adjacent = Lesson.objects.create(tutor=lesson.tutor, student=lesson.student, subject=lesson.subject, kind='regular', start=lesson.end, duration_min=60, status='pending')
    assert adjacent.pk


@pytest.mark.django_db(transaction=True)
def test_concurrent_request_quota_cannot_be_bypassed():
    if connection.vendor != 'postgresql':
        pytest.skip('PostgreSQL row lock test')
    from requests_board.models import StudyRequest
    call_command('seed_demo', verbosity=0)
    user = User.objects.get(email='olga@mail.ru')
    for _ in range(3):
        StudyRequest.objects.create(student=user, subject='English', expires_at=timezone.now() + timedelta(days=1))
    assert StudyRequest.objects.filter(student=user, status='open').count() == 4
    def post():
        try:
            client = Api()
            client.force_login(User.objects.get(pk=user.pk))
            return client.call('post', '/requests', {'subjects': ['Английский'], 'description': 'Нужны занятия'}).status_code
        finally:
            connections.close_all()
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: post(), range(2)))
    assert sorted(statuses) == [201, 409]
    assert StudyRequest.objects.filter(student=user, status='open').count() == 5
