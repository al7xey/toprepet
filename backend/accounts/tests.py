import pytest
from django.core import mail

from accounts.models import EmailToken, User
from conftest import Api


def signup(api, **kw):
    body = {'role': 'student', 'name': 'Ольга', 'email': 'olga.test@mail.ru', 'password': 'password1', **kw}
    return api.call('post', '/auth/signup', body)


def test_signup_logs_in_and_sends_verification(api):
    response = signup(api)
    assert response.status_code == 201
    assert response.json() == {'id': response.json()['id'], 'role': 'student', 'name': 'Ольга', 'email': 'olga.test@mail.ru', 'emailVerified': False, 'timezone': 'Europe/Moscow', 'onboarded': False}
    assert api.get_ok('/auth/me')['email'] == 'olga.test@mail.ru'
    assert len(mail.outbox) == 1 and '/auth/verify?token=' in mail.outbox[0].body


def test_signup_rejects_duplicate_and_short_password(api):
    signup(api)
    assert signup(api).status_code == 409
    other = Api()
    resp = signup(other, email='x@mail.ru', password='short')
    assert resp.status_code == 400 and 'не короче 8' in resp.json()['message']


def test_login_errors_do_not_reveal_which_field_is_wrong(api):
    signup(api)
    api.logout()
    wrong_pass = api.call('post', '/auth/login', {'email': 'olga.test@mail.ru', 'password': 'nope'})
    unknown = api.call('post', '/auth/login', {'email': 'nobody@mail.ru', 'password': 'password1'})
    assert wrong_pass.status_code == unknown.status_code == 400
    assert wrong_pass.json()['message'] == unknown.json()['message'] == 'Неверная почта или пароль'
    assert api.call('get', '/auth/me').status_code == 401


def test_login_email_is_case_insensitive_and_logout_clears_session(api):
    signup(api)
    api.logout()
    assert api.call('post', '/auth/login', {'email': ' Olga.Test@Mail.ru ', 'password': 'password1'}).status_code == 200
    assert api.call('post', '/auth/logout').status_code == 204
    assert api.call('get', '/auth/me').status_code == 401


def test_verify_email_is_one_time(api):
    signup(api)
    token = mail.outbox[0].body.split('token=')[1].split()[0]
    assert api.post_ok('/auth/verify', {'token': token})['emailVerified'] is True
    assert api.call('post', '/auth/verify', {'token': token}).status_code == 400
    assert api.call('post', '/auth/verify', {'token': ''}).status_code == 400


def test_password_reset_same_answer_and_works_once(api):
    signup(api)
    mail.outbox.clear()
    assert api.call('post', '/auth/password-reset', {'email': 'ghost@mail.ru'}).status_code == 204
    assert mail.outbox == []
    assert api.call('post', '/auth/password-reset', {'email': 'olga.test@mail.ru'}).status_code == 204
    token = mail.outbox[0].body.split('token=')[1].split()[0]
    assert api.call('post', '/auth/password-reset/confirm', {'token': token, 'password': 'newpassword1'}).status_code == 204
    assert api.call('post', '/auth/password-reset/confirm', {'token': token, 'password': 'another12345'}).status_code == 400
    api.logout()
    assert api.call('post', '/auth/login', {'email': 'olga.test@mail.ru', 'password': 'newpassword1'}).status_code == 200


def test_onboarding_and_update_me(api):
    signup(api)
    assert api.post_ok('/auth/me' if False else '/me/onboarding', {'forWhom': 'child', 'subjects': ['Математика'], 'goal': 'ОГЭ'})['onboarded'] is True
    patched = api.call('patch', '/me', {'name': 'Ольга П.', 'timezone': 'Asia/Yekaterinburg'}, 200).json()
    assert patched['name'] == 'Ольга П.' and patched['timezone'] == 'Asia/Yekaterinburg'
    assert api.call('patch', '/me', {'timezone': 'Mars/Base'}).status_code == 400


def test_foreign_origin_is_rejected_and_forms_are_not_accepted(api):
    api.credentials()
    evil = Api(HTTP_ORIGIN='https://evil.example')
    assert evil.call('post', '/auth/login', {'email': 'a@b.ru', 'password': 'x'}).status_code == 403
    assert api.post('/auth/login', 'email=a@b.ru&password=x', content_type='application/x-www-form-urlencoded').status_code == 415


def test_tutor_signup_creates_draft_profile(api):
    resp = signup(api, role='tutor', email='tutor.test@mail.ru')
    data = resp.json()
    assert data['role'] == 'tutor' and data['tutorId']
    user = User.objects.get(email='tutor.test@mail.ru')
    assert user.tutor.status == 'draft' and len(user.tutor.week) == 7


def test_yandex_is_not_configured_yet(api):
    assert api.call('post', '/auth/yandex').status_code == 501
