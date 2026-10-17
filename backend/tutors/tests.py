import io
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from conftest import Api
from tutors.models import Tutor, student_price


@pytest.fixture
def demo(db):
    call_command('seed_demo', verbosity=0)


def test_student_price_matches_frontend_rounding():
    assert student_price(2000) == 2200
    assert student_price(1600) == 1760
    assert student_price(1333) == round(1333 * 1.1)
    assert student_price(5) == 6  # половина округляется вверх, как Math.round


def test_catalog_filters_sorting_and_pagination(api, demo):
    page = api.get_ok('/tutors', {'limit': 4})
    assert page['total'] == 11 and len(page['items']) == 4 and page['nextCursor'] == '4'
    assert page['items'][0]['id'] == 'english' and page['items'][0]['studentPrice'] == 1320
    second = api.get_ok('/tutors', {'limit': 4, 'cursor': page['nextCursor']})
    assert second['items'][0]['id'] != page['items'][0]['id']
    assert api.get_ok('/tutors', {'query': 'АНГЛИЙСК', 'limit': 50})['total'] >= 1
    assert api.get_ok('/tutors', {'priceMax': 1000, 'limit': 50})['total'] == 0
    assert all(t['introMinutes'] > 0 for t in api.get_ok('/tutors', {'hasIntro': 'true', 'limit': 50})['items'])
    prices = [t['studentPrice'] for t in api.get_ok('/tutors', {'sort': 'price_desc', 'limit': 50})['items']]
    assert prices == sorted(prices, reverse=True)
    assert api.call('get', '/tutors', {'limit': 'abc'}).status_code == 400


def test_draft_profile_is_not_public_but_visible_to_its_owner(api, demo):
    api.post_ok('/auth/signup', {'role': 'tutor', 'name': 'Ирина', 'email': 'irina.t@mail.ru', 'password': 'password1'}, 201)
    tutor_id = api.get_ok('/auth/me')['tutorId']
    assert api.get_ok(f'/tutors/{tutor_id}')['status'] == 'draft'
    assert tutor_id not in [t['id'] for t in api.get_ok('/tutors', {'limit': 50})['items']]
    anonymous = Api()
    assert anonymous.call('get', f'/tutors/{tutor_id}').status_code == 404
    assert anonymous.call('get', '/tutors/nope').status_code == 404


def test_slots_follow_week_exceptions_and_booked_lessons(api, demo):
    api.login_as('anastasia@toprepet.ru')
    slots = api.get_ok('/tutors/english/slots', {'from': timezone.now().isoformat(), 'days': 14})
    free = [s for s in slots if s['available']]
    assert free and all(s['start'].endswith('Z') for s in slots)
    day = free[0]['start'][:10]
    assert api.call('put', f'/tutor/schedule/exceptions/{day}', {'kind': 'off', 'intervals': []}, 200)
    after = api.get_ok('/tutors/english/slots', {'from': free[0]['start'], 'days': 1})
    assert [s for s in after if s['start'][:10] == day and s['available']] == []
    api.call('delete', f'/tutor/schedule/exceptions/{day}', status=200)
    assert len(api.get_ok('/tutors/english/slots', {'from': free[0]['start'], 'days': 1})) >= 1


def test_week_validation_and_normalisation(api, demo):
    api.login_as('anastasia@toprepet.ru')
    bad = api.call('put', '/tutor/schedule', {'days': [{'weekday': 1, 'intervals': [{'from': '21:00', 'to': '18:00'}]}]})
    assert bad.status_code == 400
    ok = api.call('put', '/tutor/schedule', {'days': [{'weekday': 2, 'intervals': [{'from': '10:00', 'to': '12:00'}]}]}, 200).json()
    assert len(ok['days']) == 7 and ok['days'][1]['intervals'] == [{'from': '10:00', 'to': '12:00'}] and ok['days'][0]['intervals'] == []


def test_profile_edit_rejects_contacts_and_updates_public_card(api, demo):
    api.login_as('anastasia@toprepet.ru')
    assert api.call('patch', '/tutor/profile', {'about': 'Пишите мне в t.me/anastasia'}).status_code == 400
    profile = api.call('patch', '/tutor/profile', {'headline': 'Английский для школьников', 'price': 1500, 'introMinutes': 15, 'subjects': ['Английский', 'История']}, 200).json()
    assert profile['status'] == 'published' and profile['price'] == 1500
    card = api.get_ok('/tutors/english')
    assert card['studentPrice'] == 1650 and card['cardSubjects'] == 'Английский / История' and card['introMinutes'] == 15


def test_new_profile_goes_to_review_and_needs_schedule(api, demo):
    api.post_ok('/auth/signup', {'role': 'tutor', 'name': 'Ирина', 'email': 'irina.t@mail.ru', 'password': 'password1'}, 201)
    assert 'Заполните' in api.call('post', '/tutor/profile/submit').json()['message']
    api.call('patch', '/tutor/profile', {'headline': 'Математика', 'about': 'Преподаю математику десять лет', 'subjects': ['Математика'], 'price': 1500, 'introMinutes': 15}, 200)
    assert 'расписании' in api.call('post', '/tutor/profile/submit').json()['message']
    api.call('put', '/tutor/schedule', {'days': [{'weekday': 1, 'intervals': [{'from': '10:00', 'to': '14:00'}]}]}, 200)
    assert api.post_ok('/tutor/profile/submit')['status'] == 'review'
    assert api.get_ok('/auth/me')['onboarded'] is True


def test_only_tutors_reach_cabinet_endpoints(api, demo):
    api.login_as('olga@mail.ru')
    assert api.call('get', '/tutor/profile').status_code == 403
    assert Api().call('get', '/tutor/profile').status_code == 401


def png(size=(20, 20)):
    buf = io.BytesIO()
    Image.new('RGB', size, 'orange').save(buf, 'PNG')
    return buf.getvalue()


def test_photo_and_document_upload_rules(api, demo, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    api.login_as('anastasia@toprepet.ru')
    ok = api.post('/tutor/photo', {'file': SimpleUploadedFile('a.png', png(), 'image/png')}, format='multipart')
    assert ok.status_code == 200 and ok.json()['url'].endswith('.png')
    fake = api.post('/tutor/photo', {'file': SimpleUploadedFile('a.png', b'not an image', 'image/png')}, format='multipart')
    assert fake.status_code == 400
    doc = api.post('/tutor/documents', {'title': 'Диплом магистра', 'file': SimpleUploadedFile('d.pdf', b'%PDF-1.4', 'application/pdf')}, format='multipart')
    assert doc.status_code == 201 and doc.json()['status'] == 'checking'
    assert any(d['title'] == 'Диплом магистра' for d in api.get_ok('/tutor/documents'))
    exe = api.post('/tutor/documents', {'title': 'Вирус', 'file': SimpleUploadedFile('d.exe', b'MZ', 'application/octet-stream')}, format='multipart')
    assert exe.status_code == 400
