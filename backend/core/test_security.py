import copy
import uuid

import pytest
from django.core.cache import cache
from django.core.management import call_command
from django.test import RequestFactory
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from conftest import Api
from core.client_ip import client_ip
from core.errors import exception_handler
from core.models import RateLimitBucket
from core.uploads import BoundedUploadHandler
from core.errors import ApiError


@pytest.fixture
def world(db):
    call_command('seed_demo', verbosity=0)
    return Api()


@pytest.mark.parametrize('payload', [
    "' OR 1=1 --", "'; DROP TABLE accounts_user; --", "' UNION SELECT password FROM accounts_user --",
    '" OR ""=""', "') /* injmarker */ OR TRUE --", "injmarker' AND pg_sleep(10)--",
])
@pytest.mark.parametrize('parameter', ['query', 'subject'])
def test_sql_injection_remains_a_parameter(world, payload, parameter):
    from django.db import connection
    before = list(User.objects.values_list('pk', 'password').order_by('pk'))
    statements = []
    def wrapper(execute, sql, params, many, context):
        statements.append((sql, params))
        assert 'injmarker' not in sql.lower()
        assert 'DROP TABLE' not in sql
        return execute(sql, params, many, context)
    with connection.execute_wrapper(wrapper):
        result = world.call('get', '/tutors', {parameter: payload})
    assert result.status_code == 200 and result.json()['items'] == []
    assert statements
    assert before == list(User.objects.values_list('pk', 'password').order_by('pk'))


@pytest.mark.parametrize('params', [
    {'sort': 'price; DROP TABLE tutors_tutor'}, {'cursor': '0 OR 1=1'},
    {'limit': '1; SELECT pg_sleep(10)'}, {'limit': 1000000}, {'query': 'x' * 201},
    {'priceMax': '-1'}, {'subject': 'x' * 121},
])
def test_catalog_rejects_invalid_or_expensive_parameters(world, params):
    assert world.call('get', '/tutors', params).status_code == 400


def test_new_endpoints_deny_anonymous_by_default(db):
    class ForgottenPermissionView(APIView):
        def get(self, request):
            return Response({'secret': 'must not escape'})
    request = RequestFactory().get('/future-endpoint')
    assert ForgottenPermissionView.as_view()(request).status_code == 401


@pytest.mark.parametrize('path', ['/bookings', '/me', '/auth/signup', '/auth/password-reset/confirm'])
def test_json_arrays_are_not_valid_command_objects(world, path):
    world.login_as('olga@mail.ru')
    method = 'patch' if path == '/me' else 'post'
    assert world.call(method, path, ['not', 'an', 'object']).status_code == 400


def test_inactive_session_cannot_access_private_data(world):
    world.login_as('olga@mail.ru')
    User.objects.filter(email='olga@mail.ru').update(is_active=False)
    assert world.call('get', '/me/cards').status_code == 401


def test_rate_limit_survives_cache_clear_and_ignores_spoofed_headers(world, settings):
    config = copy.deepcopy(settings.REST_FRAMEWORK)
    config['DEFAULT_THROTTLE_RATES']['anon'] = '2/min'
    settings.REST_FRAMEWORK = config
    assert world.call('get', '/tutors').status_code == 200
    cache.clear()
    assert Api().call('get', '/tutors').status_code == 200
    denied = Api(HTTP_X_FORWARDED_FOR='8.8.8.8').call('get', '/tutors')
    assert denied.status_code == 429 and int(denied['Retry-After']) > 0
    assert all(len(key) == 64 for key in RateLimitBucket.objects.values_list('key', flat=True))


def test_proxy_chain_requires_explicit_trust(settings):
    factory = RequestFactory()
    request = factory.get('/', REMOTE_ADDR='198.51.100.5', HTTP_X_FORWARDED_FOR='1.1.1.1')
    settings.TRUSTED_PROXY_CIDRS = []
    assert client_ip(request) == '198.51.100.5'
    settings.TRUSTED_PROXY_CIDRS = ['10.0.0.0/8']
    request = factory.get('/', REMOTE_ADDR='10.0.0.2', HTTP_X_FORWARDED_FOR='1.1.1.1, 198.51.100.5, 10.0.0.1')
    assert client_ip(request) == '198.51.100.5'
    request.META['HTTP_X_FORWARDED_FOR'] = 'invalid'
    assert client_ip(request) == '10.0.0.2'


def test_body_limit_and_security_headers(world, settings):
    settings.MAX_JSON_BYTES = 128
    response = world.post('/auth/login', b'x' * 129, content_type='application/json')
    assert response.status_code == 413
    assert response['Cache-Control'] == 'no-store'
    assert "default-src 'none'" in response['Content-Security-Policy']
    assert response['Referrer-Policy'] == 'no-referrer'
    assert uuid.UUID(hex=response['X-Request-ID'])


def test_upload_limit_counts_actual_streamed_bytes(settings):
    settings.MAX_UPLOAD_BYTES = 5
    handler = BoundedUploadHandler()
    assert handler.receive_data_chunk(b'1234', 0) == b'1234'
    with pytest.raises(ApiError) as error:
        handler.receive_data_chunk(b'56', 4)
    assert error.value.status_code == 413


def test_internal_errors_never_expose_exception_or_secrets():
    response = exception_handler(RuntimeError('password=private SQL SELECT database-detail'), {})
    assert response.status_code == 500
    assert 'private' not in str(response.data) and 'SELECT' not in str(response.data)


def test_password_reset_invalidates_existing_sessions(world):
    from accounts.models import EmailToken
    world.login_as('olga@mail.ru')
    user = User.objects.get(email='olga@mail.ru')
    old = Api()
    old.cookies = copy.deepcopy(world.cookies)
    token = EmailToken.issue(user, EmailToken.RESET, 1)
    Api().call('post', '/auth/password-reset/confirm', {'token': token, 'password': 'strong-reset-2026'}, status=204)
    assert old.call('get', '/auth/me').status_code == 401
    assert world.call('get', '/auth/me').status_code == 401


def test_login_rotates_session_and_logout_revokes_it(world):
    world.login_as('olga@mail.ru')
    old_key = world.cookies['toprepet_session'].value
    old = Api()
    old.cookies = copy.deepcopy(world.cookies)
    world.post_ok('/auth/login', {'email': 'anastasia@toprepet.ru', 'password': 'demo'})
    assert world.cookies['toprepet_session'].value != old_key
    assert old.call('get', '/auth/me').status_code == 401
    current = Api()
    current.cookies = copy.deepcopy(world.cookies)
    world.call('post', '/auth/logout', {}, status=204)
    assert current.call('get', '/auth/me').status_code == 401


def test_short_ids_have_128_bits_of_randomness():
    from core.ids import new_id
    value = new_id('card')
    assert len(value) == 37
    int(value.split('-')[1], 16)


def test_untrusted_forwarded_scheme_does_not_disable_https_redirect(world, settings):
    settings.SECURE_SSL_REDIRECT = True
    settings.TRUSTED_PROXY_CIDRS = []
    response = world.get('/tutors', HTTP_X_FORWARDED_PROTO='https')
    assert response.status_code == 301 and response['Location'].startswith('https://')


def test_unconfigured_mail_never_logs_tokens_or_reveals_account(world, settings):
    from django.core import mail
    settings.EMAIL_CONFIGURED = False
    responses = [world.call('post', '/auth/password-reset', {'email': email}) for email in ['olga@mail.ru', 'absent@example.com']]
    assert [r.status_code for r in responses] == [503, 503]
    assert responses[0].json() == responses[1].json()
    assert not mail.outbox


def test_legacy_public_document_routes_are_blocked(world, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    path = tmp_path / 'documents' / 'legacy.pdf'
    path.parent.mkdir()
    path.write_bytes(b'private')
    assert world.call('get', '/media/documents/legacy.pdf').status_code == 404


def test_profile_mass_assignment_cannot_escalate_role(world):
    world.login_as('olga@mail.ru')
    response = world.call('patch', '/me', {'name': 'Updated', 'role': 'admin', 'is_staff': True, 'is_superuser': True}, status=200)
    user = User.objects.get(email='olga@mail.ru')
    assert response.json()['role'] == 'student'
    assert user.role == 'student' and not user.is_staff and not user.is_superuser
    assert world.call('get', '/admin/disputes').status_code == 403


def test_profile_save_never_restores_password_loaded_before_a_reset(world, monkeypatch):
    from accounts.serializers import MePatchIn
    from django.contrib.auth.hashers import make_password
    world.login_as('olga@mail.ru')
    validate = MePatchIn.is_valid
    new_hash = make_password('reset-during-profile-update')
    def reset_between_authentication_and_save(serializer, **kwargs):
        User.objects.filter(email='olga@mail.ru').update(password=new_hash)
        return validate(serializer, **kwargs)
    monkeypatch.setattr(MePatchIn, 'is_valid', reset_between_authentication_and_save)
    world.call('patch', '/me', {'name': 'Updated'}, status=200)
    assert User.objects.get(email='olga@mail.ru').password == new_hash


def test_password_change_rechecks_current_hash_after_a_concurrent_reset(world):
    from accounts.views import MePasswordView
    from django.contrib.auth.hashers import make_password
    from rest_framework.test import APIRequestFactory, force_authenticate
    stale_user = User.objects.get(email='olga@mail.ru')
    new_hash = make_password('reset-during-password-update')
    User.objects.filter(pk=stale_user.pk).update(password=new_hash)
    request = APIRequestFactory().post('/me/password', {'current': 'demo', 'password': 'another-strong-password'}, format='json')
    force_authenticate(request, user=stale_user)
    assert MePasswordView.as_view()(request).status_code == 400
    assert User.objects.get(email='olga@mail.ru').password == new_hash


@pytest.mark.parametrize('password', ['password1', '12345678987654321'])
def test_weak_passwords_are_rejected_on_signup_and_reset(world, password):
    from accounts.models import EmailToken
    world.call('post', '/auth/signup', {'name': 'New', 'email': 'new@example.com', 'role': 'student', 'password': password}, status=400)
    user = User.objects.get(email='olga@mail.ru')
    token = EmailToken.issue(user, EmailToken.RESET, 1)
    world.call('post', '/auth/password-reset/confirm', {'token': token, 'password': password}, status=400)
    assert EmailToken.objects.get(token_hash=EmailToken.digest(token)).used_at is None


@pytest.mark.parametrize('field', ['budgetMin', 'budgetMax'])
@pytest.mark.parametrize('value', [1_000_001, 2 ** 80])
def test_request_budget_is_bounded_before_writing_postgres(world, field, value):
    world.login_as('olga@mail.ru')
    world.call('post', '/requests', {'subjects': ['Английский'], 'description': 'Нужны занятия', field: value}, status=400)
