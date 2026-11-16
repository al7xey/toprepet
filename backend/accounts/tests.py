from django.core import mail

from accounts.models import User
from conftest import Api


def signup(api, **kw):
    body = {'role': 'student', 'name': 'Ольга', 'email': 'olga.test@mail.ru', 'password': 'Strong-local-test-42!', **kw}
    return api.call('post', '/auth/signup', body)


def test_signup_logs_in_and_sends_verification(api):
    response = signup(api)
    assert response.status_code == 201
    assert response.json() == {'id': response.json()['id'], 'role': 'student', 'name': 'Ольга', 'email': 'olga.test@mail.ru', 'emailVerified': False, 'timezone': 'Europe/Moscow', 'onboarded': False, 'photo': None, 'notifications': {'lessons': True, 'messages': True, 'reminders': True}}
    assert api.get_ok('/auth/me')['email'] == 'olga.test@mail.ru'
    assert len(mail.outbox) == 1 and 'Код подтверждения: ' in mail.outbox[0].body


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
    unknown = api.call('post', '/auth/login', {'email': 'nobody@mail.ru', 'password': 'Strong-local-test-42!'})
    assert wrong_pass.status_code == unknown.status_code == 400
    assert wrong_pass.json()['message'] == unknown.json()['message'] == 'Неверная почта или пароль'
    assert api.call('get', '/auth/me').status_code == 401


def test_login_email_is_case_insensitive_and_logout_clears_session(api):
    signup(api)
    api.logout()
    assert api.call('post', '/auth/login', {'email': ' Olga.Test@Mail.ru ', 'password': 'Strong-local-test-42!'}).status_code == 200
    assert api.call('post', '/auth/logout').status_code == 204
    assert api.call('get', '/auth/me').status_code == 401


def test_verify_email_is_one_time(api):
    signup(api)
    token = mail.outbox[0].body.split('Код подтверждения: ')[1].split()[0]
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


def test_change_password_needs_the_current_one_and_keeps_the_session(api):
    signup(api)
    assert api.call('post', '/me/password', {'current': 'wrong-one', 'password': 'newpassword1'}).status_code == 400
    assert api.call('post', '/me/password', {'current': 'Strong-local-test-42!', 'password': 'short'}).status_code == 400
    api.post_ok('/me/password', {'current': 'Strong-local-test-42!', 'password': 'newpassword1'})
    assert api.get_ok('/me')['email'] == 'olga.test@mail.ru'  # сессия осталась
    other = Api()
    assert other.call('post', '/auth/login', {'email': 'olga.test@mail.ru', 'password': 'newpassword1'}).status_code == 200


def test_notification_settings_are_saved_and_unknown_keys_ignored(api):
    signup(api)
    me = api.call('patch', '/me', {'notifications': {'messages': False, 'unknown': True}}, 200).json()
    assert me['notifications'] == {'lessons': True, 'messages': False, 'reminders': True}


def test_profile_photo_upload(api, settings, tmp_path):
    import io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image
    settings.MEDIA_ROOT = tmp_path
    signup(api)
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), 'orange').save(buf, 'PNG')
    ok = api.post('/me/photo', {'file': SimpleUploadedFile('a.png', buf.getvalue(), 'image/png')}, format='multipart')
    assert ok.status_code == 200 and ok.json()['photo'].endswith('.png')
    bad = api.post('/me/photo', {'file': SimpleUploadedFile('a.png', b'not an image', 'image/png')}, format='multipart')
    assert bad.status_code == 400


def test_verification_code_locks_after_five_wrong_attempts(api):
    from accounts.models import EmailToken
    signup(api)
    code = mail.outbox[-1].body.split('Код подтверждения: ')[1].split()[0]
    wrong = '000000' if code != '000000' else '111111'
    for _ in range(5):
        assert api.call('post', '/auth/verify', {'token': wrong}).status_code == 400
    assert api.call('post', '/auth/verify', {'token': code}).status_code == 400
    assert EmailToken.objects.get(user__email='olga.test@mail.ru', kind='verify').attempts == 5


def test_code_is_scoped_to_the_signed_in_user(api):
    from unittest.mock import patch
    other = Api()
    with patch('accounts.models.secrets.randbelow', side_effect=[123456, 654321]):
        signup(api)
        code = mail.outbox[-1].body.split('Код подтверждения: ')[1].split()[0]
        signup(other, email='other@example.invalid')
    assert other.call('post', '/auth/verify', {'token': code}).status_code == 400
    assert api.post_ok('/auth/verify', {'token': code})['emailVerified']


def test_expired_code_cannot_verify_and_resend_replaces_it(api):
    from datetime import timedelta
    from django.utils import timezone
    from accounts.models import EmailToken
    signup(api)
    code = mail.outbox[-1].body.split('Код подтверждения: ')[1].split()[0]
    EmailToken.objects.filter(kind='verify').update(expires_at=timezone.now() - timedelta(seconds=1))
    assert api.call('post', '/auth/verify', {'token': code}).status_code == 400
    assert api.call('post', '/auth/verify/resend').status_code == 204
    replacement = mail.outbox[-1].body.split('Код подтверждения: ')[1].split()[0]
    assert replacement != code
    assert api.call('post', '/auth/verify', {'token': code}).status_code == 400
    assert api.post_ok('/auth/verify', {'token': replacement})['emailVerified']


def test_code_preserves_leading_zeros_and_requires_a_session(api):
    from unittest.mock import patch
    with patch('accounts.models.secrets.randbelow', return_value=42):
        signup(api)
    assert 'Код подтверждения: 000042' in mail.outbox[-1].body
    assert Api().call('post', '/auth/verify', {'token': '000042'}).status_code == 401
    assert api.post_ok('/auth/verify', {'token': '000042'})['emailVerified']
