from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command, CommandError

from conftest import Api
from accounts.models import User
from core.models import SecurityEvent
from tutors.models import TutorDocument

PDF = b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'


@pytest.fixture
def documents(db, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / 'public'
    settings.PRIVATE_MEDIA_ROOT = tmp_path / 'private'
    call_command('seed_demo', verbosity=0)
    tutor = Api()
    tutor.login_as('anastasia@toprepet.ru')
    return tutor


def upload(tutor, name='d.pdf', data=PDF):
    return tutor.post('/tutor/documents', {'title': 'Диплом', 'file': SimpleUploadedFile(name, data, 'application/pdf')}, format='multipart')


@pytest.mark.django_db(transaction=True)
def test_private_file_has_owner_admin_access_only(documents, settings):
    response = upload(documents)
    assert response.status_code == 201
    doc = TutorDocument.objects.get(pk=response.json()['id'])
    assert doc.file.path.startswith(str(settings.PRIVATE_MEDIA_ROOT))
    assert not list(Path(settings.MEDIA_ROOT).rglob('*.pdf'))
    with pytest.raises(ValueError):
        _ = doc.file.url
    path = f'/documents/{doc.pk}/file'
    assert Api().call('get', path).status_code == 401
    stranger = Api()
    stranger.login_as('olga@mail.ru')
    assert stranger.call('get', path).status_code == 404
    foreign_tutor = Api()
    foreign_tutor.force_login(User.objects.get(email='mathematics@demo.toprepet.ru'))
    assert foreign_tutor.call('get', path).status_code == 404
    for client in [documents, stranger]:
        if client is stranger:
            client.login_as('admin@toprepet.ru')
        download = client.call('get', path)
        assert download.status_code == 200
        assert download['Content-Disposition'].startswith('attachment;')
        assert b''.join(download.streaming_content) == PDF


@pytest.mark.parametrize('name,data', [('d.pdf', b'MZ binary'), ('d.pdf', b'%PDF-truncated'), ('d.html', PDF), ('d.png', b'not-image')])
def test_disguised_or_truncated_documents_rejected(documents, name, data):
    assert upload(documents, name, data).status_code == 400


def test_document_file_is_required_and_cannot_be_moderated_by_owner(documents):
    assert documents.post('/tutor/documents', {'title': 'No file'}, format='multipart').status_code == 400
    doc = upload(documents).json()
    path = '/admin/documents/' + doc['id']
    assert documents.call('post', path, {'approve': True}).status_code == 403
    admin = Api()
    admin.login_as('admin@toprepet.ru')
    assert admin.post_ok(path, {'approve': True})['status'] == 'approved'
    assert admin.call('post', path, {'approve': False}).status_code == 409
    assert SecurityEvent.objects.filter(action='document.moderate', object_id=doc['id'], actor__role='admin', outcome='approved').count() == 1


def test_legacy_document_copy_is_verified_before_public_removal(documents, settings, django_capture_on_commit_callbacks):
    doc = upload(documents).json()
    stored = TutorDocument.objects.get(pk=doc['id'])
    public = Path(settings.MEDIA_ROOT) / stored.file.name
    public.parent.mkdir(parents=True)
    public.write_bytes(PDF)
    with django_capture_on_commit_callbacks(execute=True):
        call_command('secure_documents')
    assert not public.exists() and Path(stored.file.path).read_bytes() == PDF
    # A mismatching existing destination must leave the public original intact.
    public.write_bytes(b'other content')
    with pytest.raises(CommandError):
        call_command('secure_documents')
    assert public.exists()


def test_private_root_must_not_be_inside_public_root(documents, settings):
    from core.checks import private_storage_check
    settings.PRIVATE_MEDIA_ROOT = Path(settings.MEDIA_ROOT) / 'private'
    assert private_storage_check(None)[0].id == 'core.E001'


def test_new_document_of_published_tutor_is_visible_to_moderators(documents):
    doc = upload(documents).json()
    admin = Api()
    admin.login_as('admin@toprepet.ru')
    queue = admin.get_ok('/admin/profiles')
    item = next(item for item in queue if any(d['id'] == doc['id'] for d in item['documents']))
    assert item['profile']['status'] == 'published'
    admin.post_ok('/admin/documents/' + doc['id'], {'approve': True})
    from tutors.models import Tutor
    assert Tutor.objects.get(pk=item['tutorId']).status == 'published'
    assert TutorDocument.objects.get(pk=doc['id']).status == 'approved'
