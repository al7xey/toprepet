import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from PIL import Image

from conftest import Api
from chats.models import Conversation, Message


@pytest.fixture
def world(db, settings, tmp_path):
    settings.PRIVATE_MEDIA_ROOT = tmp_path / 'private'
    settings.MEDIA_ROOT = tmp_path / 'public'
    call_command('seed_demo', verbosity=0)
    client = Api()
    client.login_as('olga@mail.ru')
    return client


def test_history_is_bounded_cursor_is_authorized_and_get_is_read_only(world):
    conversation = Conversation.objects.get(pk='c-1')
    Message.objects.bulk_create([Message(conversation=conversation, author=conversation.student, text=f'History {i}', kind='text') for i in range(220)])
    first = world.get_ok('/conversations/c-1/messages')
    assert len(first) == 100 and conversation.unread_student == 1
    conversation.refresh_from_db()
    assert conversation.unread_student == 1
    second = world.get_ok('/conversations/c-1/messages', {'before': first[0]['id']})
    assert len(second) == 100 and not {m['id'] for m in first} & {m['id'] for m in second}
    assert world.call('get', '/conversations/c-1/messages', {'before': 'm-6'}).status_code == 404
    assert world.call('get', '/conversations/c-1/messages', {'limit': 10000}).status_code == 400
    world.post_ok('/conversations/c-1/read', {'throughMessageId': first[-1]['id']}, 204)
    conversation.refresh_from_db()
    assert conversation.unread_student == 0


def test_read_ack_does_not_mark_a_later_unseen_message(world):
    c = Conversation.objects.get(pk='c-1')
    anchor = c.messages.order_by('-at').first()
    later = Message.objects.create(conversation=c, author=c.tutor.user, text='New unseen', kind='text')
    world.post_ok('/conversations/c-1/read', {'throughMessageId': anchor.pk}, 204)
    c.refresh_from_db()
    assert c.unread_student == 1 and c.student_read_at < later.at


@pytest.mark.django_db(transaction=True)
def test_photo_requires_conversation_access_and_stays_out_of_public_storage(world, settings):
    source = io.BytesIO()
    Image.new('RGB', (8, 8), 'orange').save(source, 'PNG')
    response = world.post('/conversations/c-1/messages', {'file': SimpleUploadedFile('image.png', source.getvalue(), 'image/png')}, format='multipart')
    assert response.status_code == 201
    message = Message.objects.get(pk=response.json()['id'])
    assert message.attachment.path.startswith(str(settings.PRIVATE_MEDIA_ROOT))
    assert message.image == ''
    path = f'/conversations/c-1/messages/{message.pk}/image'
    assert Api().call('get', path).status_code == 401
    stranger = Api()
    stranger.post_ok('/auth/signup', {'role': 'student', 'name': 'Другой', 'email': 'stranger-photo@example.com', 'password': 'strong-password-2026'}, 201)
    assert stranger.call('get', path).status_code == 404
    picture = world.call('get', path)
    assert picture.status_code == 200 and picture['Content-Type'] == 'image/png'
    assert picture['Cache-Control'] == 'no-store'
    assert b''.join(picture.streaming_content)
