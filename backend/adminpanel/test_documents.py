from django.core.management import call_command
from conftest import Api

def test_document_queue_requires_admin(db):
    call_command('seed_demo', verbosity=0)
    api = Api()
    assert api.call('get', '/admin/documents').status_code == 401
    api.login_as('olga@mail.ru')
    assert api.call('get', '/admin/documents').status_code == 403
    api.login_as('admin@toprepet.ru')
    items = api.get_ok('/admin/documents')['items']
    assert all(d['status'] == 'checking' and d['tutorName'] for d in items)

def test_document_queue_is_paginated(db):
    from tutors.models import Tutor, TutorDocument
    call_command('seed_demo', verbosity=0)
    tutor = Tutor.objects.first()
    TutorDocument.objects.bulk_create([TutorDocument(tutor=tutor, title='Document', status='checking') for _ in range(105)])
    api = Api()
    api.login_as('admin@toprepet.ru')
    first = api.get_ok('/admin/documents')
    assert len(first['items']) == 100 and first['nextCursor']
    second = api.get_ok('/admin/documents', {'cursor': first['nextCursor']})
    assert second['items'] and second['nextCursor'] is None
    assert not {d['id'] for d in first['items']} & {d['id'] for d in second['items']}
    assert api.call('get', '/admin/documents', {'cursor': 'x' * 41}).status_code == 400
