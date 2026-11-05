import io
import pytest
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from PIL import Image
from conftest import Api
from tutors.models import Tutor


@pytest.fixture
def demo(db):
    call_command('seed_demo', verbosity=0)


def test_false_boolean_does_not_approve_profile(demo):
    Tutor.objects.filter(pk='english').update(status='review')
    client = Api()
    client.login_as('admin@toprepet.ru')
    assert client.post_ok('/admin/profiles/english', {'approve': 'false', 'note': 'Исправьте описание'})['status'] == 'draft'
    Tutor.objects.filter(pk='english').update(status='review')
    assert client.call('post', '/admin/profiles/english', {'approve': {'x': 1}}).status_code == 400


def test_origin_compares_scheme_as_well_as_host(demo):
    evil = Api(HTTP_ORIGIN='http://testserver')
    assert evil.post('/auth/login', {'email': 'a@b.ru', 'password': 'wrong'}, format='json', secure=True).status_code == 403


def test_catalog_query_count_is_bounded(demo):
    client = Api()
    with CaptureQueriesContext(connection) as one:
        assert client.get_ok('/tutors', {'limit': 1})['items']
    with CaptureQueriesContext(connection) as many:
        assert len(client.get_ok('/tutors', {'limit': 50})['items']) > 1
    assert len(many) <= len(one) + 1


def test_catalog_cyrillic_and_zero_price_filter(demo):
    client = Api()
    assert client.get_ok('/tutors', {'query': 'АНАСТАСИЯ'})['items']
    assert client.get_ok('/tutors', {'subject': 'Английский'})['items']
    assert client.get_ok('/tutors', {'priceMax': 0})['total'] == 0


@pytest.mark.parametrize('end', ['24:01', '24:59', '25:00'])
def test_invalid_midnight_is_rejected(demo, end):
    client = Api()
    client.login_as('anastasia@toprepet.ru')
    assert client.call('put', '/tutor/schedule', {'days': [{'weekday': 1, 'intervals': [{'from': '23:00', 'to': end}]}]}).status_code == 400


def test_photos_are_resized_and_metadata_removed(demo, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    client = Api()
    client.login_as('olga@mail.ru')
    buffer = io.BytesIO()
    source = Image.new('RGB', (2000, 1000), 'orange')
    exif = source.getexif()
    exif[270] = 'private'
    source.save(buffer, 'JPEG', exif=exif)
    assert client.post('/me/photo', {'file': SimpleUploadedFile('photo.jpg', buffer.getvalue(), 'image/jpeg')}, format='multipart').status_code == 200
    with Image.open(next(tmp_path.rglob('*.jpg'))) as image:
        assert image.width == 1600 and not image.getexif()


def test_booking_retry_header_is_allowed_in_cors(demo):
    client = Api()
    response = client.options('/bookings', HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST', HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type,idempotency-key')
    assert response.status_code == 200
    assert 'idempotency-key' in response.headers['Access-Control-Allow-Headers'].lower()


def test_seed_demo_refuses_production(settings, db):
    from django.core.management.base import CommandError
    settings.DEBUG = False
    settings.TESTING = False
    with pytest.raises(CommandError):
        call_command('seed_demo')
    from payments.providers import get_provider
    from core.errors import ApiError
    settings.PAYMENT_PROVIDER = 'fake'
    with pytest.raises(ApiError) as error:
        get_provider()
    assert error.value.status_code == 503
