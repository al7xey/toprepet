import pytest
from django.core.management import call_command

from conftest import Api


@pytest.fixture
def world(db):
    call_command('seed_demo', verbosity=0)
    clients = {}
    for key, email in (('olga', 'olga@mail.ru'), ('tutor', 'anastasia@toprepet.ru')):
        clients[key] = Api()
        clients[key].login_as(email)
    return clients


def test_each_side_sees_the_other_as_peer(world):
    olga, tutor = world['olga'], world['tutor']
    mine = olga.get_ok('/me/conversations')
    assert mine[0]['peerName'] == 'Анастасия' and mine[0]['peerRole'] == 'tutor' and mine[0]['unread'] == 1
    theirs = tutor.get_ok('/me/conversations')
    assert theirs[0]['peerName'] == 'Ольга' and theirs[0]['peerRole'] == 'student' and theirs[0]['peerPhoto'] is None


def test_reading_resets_unread_and_sending_updates_the_dialog(world):
    olga, tutor = world['olga'], world['tutor']
    assert len(olga.get_ok('/conversations/c-1/messages')) == 5
    assert olga.get_ok('/me/conversations')[0]['unread'] == 0
    sent = olga.post_ok('/conversations/c-1/messages', {'text': 'Здравствуйте! Есть время в среду?'}, 201)
    assert sent['kind'] == 'text' and sent['authorId'] == 'u-student'
    conv = tutor.get_ok('/me/conversations')[0]
    assert conv['lastMessage'] == 'Здравствуйте! Есть время в среду?' and conv['unread'] == 1
    assert any(n['title'] == 'Новое сообщение' for n in tutor.get_ok('/me/notifications'))
    assert tutor.get_ok('/conversations/c-1')['peerName'] == 'Ольга'


def test_contacts_are_blocked_in_messages(world):
    olga = world['olga']
    for text in ('Мой телефон 8 (912) 345-67-89', 'Пишите в t.me/someone', 'мой ник @anastasia_best', 'почта test@mail.ru'):
        response = olga.call('post', '/conversations/c-1/messages', {'text': text})
        assert response.status_code == 400 and 'запрещены' in response.json()['message']
    assert olga.call('post', '/conversations/c-1/messages', {'text': '   '}).status_code == 400


def test_foreign_dialogs_are_hidden(world):
    stranger = Api()
    stranger.post_ok('/auth/signup', {'role': 'student', 'name': 'Пётр', 'email': 'petr.c@mail.ru', 'password': 'password1'}, 201)
    for method, path in (('get', '/conversations/c-1'), ('get', '/conversations/c-1/messages'), ('post', '/conversations/c-1/messages')):
        assert stranger.call(method, path, {'text': 'привет'}).status_code == 404
    assert stranger.get_ok('/me/conversations') == []


def test_open_conversation_is_idempotent_and_needs_a_published_tutor(world):
    olga = world['olga']
    first = olga.post_ok('/conversations', {'tutorId': 'history'})
    again = olga.post_ok('/conversations', {'tutorId': 'history'})
    assert first['id'] == again['id'] and first['peerRole'] == 'tutor'
    assert olga.call('post', '/conversations', {'tutorId': 'nope'}).status_code == 404
    assert world['tutor'].call('post', '/conversations', {'tutorId': 'history'}).status_code == 403


def test_report_with_block_stops_the_dialog(world):
    olga, tutor = world['olga'], world['tutor']
    assert olga.call('post', '/conversations/c-1/report', {'reason': ''}).status_code == 400
    olga.call('post', '/conversations/c-1/report', {'reason': 'Спам', 'block': True}, 204)
    blocked = tutor.call('post', '/conversations/c-1/messages', {'text': 'Здравствуйте'})
    assert blocked.status_code == 403 and 'заблокирован' in blocked.json()['message']
    assert olga.get_ok('/conversations/c-1')['blocked'] is True


def test_message_is_read_after_the_other_side_opens_the_dialog(world):
    olga, tutor = world['olga'], world['tutor']
    sent = olga.post_ok('/conversations/c-1/messages', {'text': 'Здравствуйте! Есть время в среду?'}, 201)
    assert sent['read'] is False
    mine = [m for m in olga.get_ok('/conversations/c-1/messages') if m['id'] == sent['id']][0]
    assert mine['read'] is False  # собеседник ещё не открывал диалог
    tutor.get_ok('/conversations/c-1/messages')
    mine = [m for m in olga.get_ok('/conversations/c-1/messages') if m['id'] == sent['id']][0]
    assert mine['read'] is True


def test_photo_message(world, settings, tmp_path):
    import io

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image
    settings.MEDIA_ROOT = tmp_path
    buf = io.BytesIO()
    Image.new('RGB', (8, 8), 'orange').save(buf, 'PNG')
    ok = world['olga'].post('/conversations/c-1/messages', {'file': SimpleUploadedFile('a.png', buf.getvalue(), 'image/png'), 'text': 'Вот задание'}, format='multipart')
    assert ok.status_code == 201
    body = ok.json()
    assert body['kind'] == 'photo' and body['imageUrl'].endswith('.png') and body['text'] == 'Вот задание'
    bad = world['olga'].post('/conversations/c-1/messages', {'file': SimpleUploadedFile('a.png', b'not an image', 'image/png')}, format='multipart')
    assert bad.status_code == 400



def test_user_deletes_only_own_message(world):
    olga, tutor = world['olga'], world['tutor']
    sent = olga.post_ok('/conversations/c-1/messages', {'text': 'Это сообщение удалим'}, 201)
    path = f"/conversations/c-1/messages/{sent['id']}"
    tutor.call('delete', path, status=404)  # чужое сообщение удалить нельзя
    olga.call('delete', path, status=204)
    assert all(m['id'] != sent['id'] for m in olga.get_ok('/conversations/c-1/messages'))
    olga.call('delete', path, status=404)
