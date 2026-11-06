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


def test_owner_deletion_is_private_and_cleans_file_after_commit(documents, django_capture_on_commit_callbacks):
    doc_id = upload(documents).json()['id']
    doc = TutorDocument.objects.get(pk=doc_id)
    filename = Path(doc.file.path)
    stranger = Api()
    stranger.force_login(User.objects.get(email='mathematics@demo.toprepet.ru'))
    assert stranger.call('delete', '/tutor/documents/' + doc_id).status_code == 404
    assert Api().call('delete', '/tutor/documents/' + doc_id).status_code == 401
    with django_capture_on_commit_callbacks(execute=True):
        documents.call('delete', '/tutor/documents/' + doc_id, status=204)
        assert filename.exists()  # Never remove the file before its row commits.
    assert not filename.exists()
    assert SecurityEvent.objects.filter(action='document.delete', object_id=doc_id).exists()
    assert documents.call('get', f'/documents/{doc_id}/file').status_code == 404


def test_deleting_shared_legacy_path_keeps_other_document_file(documents, django_capture_on_commit_callbacks):
    doc = TutorDocument.objects.get(pk=upload(documents).json()['id'])
    second = TutorDocument.objects.create(tutor=doc.tutor, file=doc.file.name, title='Legacy duplicate')
    filename = Path(doc.file.path)
    with django_capture_on_commit_callbacks(execute=True):
        documents.call('delete', '/tutor/documents/' + doc.pk, status=204)
    assert filename.exists()
    with django_capture_on_commit_callbacks(execute=True):
        documents.call('delete', '/tutor/documents/' + second.pk, status=204)
    assert not filename.exists()


def test_deletion_releases_quota_and_revokes_last_verification(documents):
    tutor = User.objects.get(email='anastasia@toprepet.ru').tutor
    tutor.documents.all().delete()
    docs = [TutorDocument(tutor=tutor, title='Old', status='approved') for _ in range(20)]
    TutorDocument.objects.bulk_create(docs)
    assert upload(documents).status_code == 409
    assert Api().get_ok('/tutors/english')['documentsVerified']
    for doc in docs:
        documents.call('delete', '/tutor/documents/' + doc.pk, status=204)
    assert not Api().get_ok('/tutors/english')['documentsVerified']
    assert upload(documents).status_code == 201


def test_failed_file_cleanup_is_retried_durably(documents, django_capture_on_commit_callbacks):
    from unittest.mock import patch
    from tutors.models import DocumentFileDeletion
    from tutors.documents import cleanup_document_files
    doc = TutorDocument.objects.get(pk=upload(documents).json()['id'])
    filename = Path(doc.file.path)
    with patch.object(doc.file.storage, 'delete', side_effect=OSError('temporary storage failure')):
        with django_capture_on_commit_callbacks(execute=True):
            documents.call('delete', '/tutor/documents/' + doc.pk, status=204)
    assert filename.exists() and DocumentFileDeletion.objects.filter(name=doc.file.name).exists()
    assert cleanup_document_files() == 1
    assert not filename.exists() and not DocumentFileDeletion.objects.exists()


def test_delete_rolls_back_without_removing_file_if_enqueue_fails(documents):
    from unittest.mock import patch
    doc = TutorDocument.objects.get(pk=upload(documents).json()['id'])
    filename = Path(doc.file.path)
    with patch('tutors.documents.DocumentFileDeletion.objects.create', side_effect=RuntimeError('database write failed')):
        documents.call('delete', '/tutor/documents/' + doc.pk, status=500)
    assert TutorDocument.objects.filter(pk=doc.pk).exists() and filename.exists()
