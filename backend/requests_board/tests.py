import pytest
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta

from conftest import Api
from requests_board.models import StudyRequest


@pytest.fixture
def world(db):
    call_command('seed_demo', verbosity=0)
    clients = {}
    for key, email in (('olga', 'olga@mail.ru'), ('tutor', 'anastasia@toprepet.ru'), ('admin', 'admin@toprepet.ru')):
        clients[key] = Api()
        clients[key].login_as(email)
    return clients


NEW = {'subject': 'Физика', 'goal': 'ЕГЭ', 'level': '11 класс', 'budgetMax': 2000, 'schedule': ['Будни вечером'], 'description': 'Нужна подготовка к ЕГЭ по физике, два раза в неделю.'}


def test_feed_is_public_and_hides_surnames(world):
    feed = Api().get_ok('/requests')
    assert {r['id'] for r in feed} == {'r-1', 'r-2', 'r-3'} and all(' ' not in r['studentName'] for r in feed)
    assert {r['id'] for r in Api().get_ok('/requests', {'subject': 'Английский язык'})} == {'r-2', 'r-3'}


def test_create_request_validation_and_limit(world):
    olga = world['olga']
    assert olga.call('post', '/requests', {**NEW, 'description': 'коротко'}).status_code == 400
    assert olga.call('post', '/requests', {**NEW, 'description': 'Звоните мне по телефону +7 912 345 67 89 в любое время'}).status_code == 400
    created = olga.post_ok('/requests', NEW, 201)
    assert created['status'] == 'open' and created['responsesCount'] == 0
    for _ in range(3):
        olga.post_ok('/requests', NEW, 201)
    assert olga.call('post', '/requests', NEW).status_code == 409  # r-1 + четыре новых = пять открытых
    assert world['tutor'].call('post', '/requests', NEW).status_code == 403


def test_tutor_responds_once_and_student_sees_price_with_fee(world):
    tutor, olga = world['tutor'], world['olga']
    body = {'price': 1600, 'message': 'Готова заниматься по вечерам, начнём с диагностики уровня.', 'slots': [(timezone.now() + timedelta(days=2)).isoformat()]}
    response = tutor.post_ok('/requests/r-3/responses', body, 201)
    assert response['price'] == 1760 and response['tutorName'] == 'Анастасия'
    assert tutor.call('post', '/requests/r-3/responses', body).status_code == 409
    assert tutor.call('post', '/requests/r-3/responses', {**body, 'price': 100}).status_code == 400
    assert tutor.call('post', '/requests/r-2/responses', {**body, 'message': 'Пишите в t.me/anastasia, там отвечу быстрее'}).status_code == 400
    assert olga.call('get', '/requests/r-3/responses').status_code == 404  # заявка другого ученика
    assert [x['id'] for x in olga.get_ok('/requests/r-1/responses')] == ['rr-1', 'rr-2']
    mine = tutor.get_ok('/me/responses')
    assert mine[0]['request']['id'] == 'r-3'


def test_expired_and_closed_requests_do_not_accept_responses(world):
    olga, tutor = world['olga'], world['tutor']
    body = {'price': 1600, 'message': 'Готова заниматься по вечерам, начнём с диагностики уровня.', 'slots': []}
    StudyRequest.objects.filter(id='r-2').update(expires_at=timezone.now() - timedelta(hours=1))
    assert tutor.call('post', '/requests/r-2/responses', body).status_code == 400
    assert olga.get_ok('/requests/r-1')['status'] == 'open'
    assert olga.post_ok('/requests/r-1/close')['status'] == 'closed'
    assert olga.call('post', '/requests/r-1/close').status_code == 400
    assert 'r-1' not in [r['id'] for r in Api().get_ok('/requests')]


def test_booking_from_a_response_closes_the_request(world):
    olga = world['olga']
    slots = olga.get_ok('/tutors/mathematics/slots', {'from': (timezone.now() + timedelta(hours=6)).isoformat(), 'days': 14})
    start = next(s['start'] for s in slots if s['available'])
    lesson = olga.post_ok('/bookings', {'tutorId': 'mathematics', 'kind': 'regular', 'subject': 'Математика', 'start': start, 'durationMin': 60, 'requestId': 'r-1'}, 201)
    assert olga.get_ok('/requests/r-1')['status'] == 'booked'
    statuses = {x['tutorId']: x['status'] for x in olga.get_ok('/requests/r-1/responses')}
    assert statuses['mathematics'] == 'accepted' and [v for k, v in statuses.items() if k != 'mathematics'] == ['closed']
    assert lesson['status'] == 'pending'
