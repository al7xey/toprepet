import pytest
from django.core.management import call_command

from conftest import Api

PRIVATE_GET = ['/auth/me', '/me/lessons', '/me/cards', '/me/payments', '/me/notifications', '/me/conversations', '/me/requests', '/me/responses', '/me/reviews', '/me/tutors',
               '/tutor/profile', '/tutor/schedule', '/tutor/schedule/exceptions', '/tutor/documents', '/tutor/finance', '/tutor/payout', '/tutor/students',
               '/lessons/l-1', '/disputes/dp-1', '/conversations/c-1', '/conversations/c-1/messages', '/requests/r-1', '/requests/r-1/responses',
               '/admin/disputes', '/admin/cancellations', '/admin/reviews', '/admin/profiles']
PRIVATE_POST = ['/auth/logout' if False else '/me/onboarding', '/auth/verify/resend', '/bookings', '/lessons/l-1/cancel', '/lessons/l-1/confirm', '/lessons/l-1/decline', '/lessons/l-1/result',
                '/lessons/l-1/problem', '/lessons/l-1/review', '/reviews/rv-1/reply', '/requests', '/requests/r-1/close', '/requests/r-1/responses', '/conversations',
                '/conversations/c-1/messages', '/conversations/c-1/report', '/me/cards', '/me/notifications/read', '/tutor/profile/submit',
                '/admin/disputes/dp-1/resolve', '/admin/reviews/rv-1', '/admin/profiles/english']


@pytest.fixture
def demo(db):
    call_command('seed_demo', verbosity=0)


@pytest.mark.parametrize('path', PRIVATE_GET)
def test_private_get_requires_login(demo, path):
    assert Api().call('get', path).status_code == 401


@pytest.mark.parametrize('path', PRIVATE_POST)
def test_private_post_requires_login(demo, path):
    assert Api().call('post', path, {}).status_code == 401


def test_public_endpoints_work_without_login(demo):
    client = Api()
    for path in ('/health', '/tutors', '/tutors/english', '/tutors/english/slots', '/tutors/english/reviews', '/requests'):
        assert client.call('get', path).status_code == 200, path


def test_student_cannot_use_tutor_or_admin_endpoints_and_vice_versa(demo):
    olga, tutor = Api(), Api()
    olga.login_as('olga@mail.ru')
    tutor.login_as('anastasia@toprepet.ru')
    for path in ('/tutor/finance', '/tutor/schedule', '/admin/disputes', '/admin/profiles'):
        assert olga.call('get', path).status_code == 403, path
    for path in ('/admin/disputes', '/admin/reviews'):
        assert tutor.call('get', path).status_code == 403, path
    assert tutor.call('post', '/bookings', {'tutorId': 'english', 'kind': 'regular', 'subject': 'x', 'start': '2030-01-01T10:00:00Z', 'durationMin': 60}).status_code == 403
    assert olga.call('post', '/me/cards', {'number': '2200 0000 0000 0001', 'expiry': '12/30', 'cvc': '1'}).status_code == 201
    assert tutor.call('post', '/me/cards', {'number': '2200 0000 0000 0001', 'expiry': '12/30', 'cvc': '1'}).status_code == 403


def test_error_shape_is_message_and_code(demo):
    body = Api().call('get', '/tutors/nope').json()
    assert set(body) == {'message', 'code'} and body['code'] == 'not_found'
    assert Api().call('get', '/auth/me').json() == {'message': 'Войдите, чтобы продолжить', 'code': 'unauthorized'}
