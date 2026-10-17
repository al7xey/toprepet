import pytest
from django.core.management import call_command

from conftest import Api


@pytest.fixture
def world(db):
    call_command('seed_demo', verbosity=0)
    clients = {}
    for key, email in (('olga', 'olga@mail.ru'), ('tutor', 'anastasia@toprepet.ru'), ('admin', 'admin@toprepet.ru')):
        clients[key] = Api()
        clients[key].login_as(email)
    return clients


TEXT = 'Очень понятно объясняет, после урока всё стало ясно.'


def test_review_goes_through_moderation_and_changes_rating(world):
    olga, tutor, admin = world['olga'], world['tutor'], world['admin']
    review = olga.post_ok('/lessons/l-4/review', {'rating': 5, 'text': TEXT}, 201)
    assert review['status'] == 'pending'
    assert olga.get_ok('/tutors/english/reviews') == []
    assert tutor.get_ok('/me/reviews') == []
    assert [r['id'] for r in admin.get_ok('/admin/reviews')] == [review['id']]
    assert admin.post_ok(f'/admin/reviews/{review["id"]}', {'approve': True})['status'] == 'published'
    assert olga.get_ok('/tutors/english/reviews')[0]['text'] == TEXT
    card = olga.get_ok('/tutors/english')
    assert card['rating'] == 5.0 and card['reviewsCount'] == 1
    other = olga.post_ok('/lessons/l-5/review', {'rating': 4, 'text': 'Хорошо, но хотелось бы больше практики.'}, 201)
    admin.post_ok(f'/admin/reviews/{other["id"]}', {'approve': True})
    assert olga.get_ok('/tutors/english')['rating'] == 4.5
    assert admin.call('post', f'/admin/reviews/{other["id"]}', {'approve': False}).status_code == 400


def test_review_rules(world):
    olga, tutor = world['olga'], world['tutor']
    assert olga.call('post', '/lessons/l-4/review', {'rating': 5, 'text': 'коротко'}).status_code == 400
    assert olga.call('post', '/lessons/l-4/review', {'rating': 7, 'text': TEXT}).status_code == 400
    assert olga.call('post', '/lessons/l-4/review', {'rating': 5, 'text': 'Пишите мне на почту test@mail.ru, всё объясню'}).status_code == 400
    assert olga.call('post', '/lessons/l-1/review', {'rating': 5, 'text': TEXT}).status_code == 400  # урок ещё не прошёл
    assert tutor.call('post', '/lessons/l-4/review', {'rating': 5, 'text': TEXT}).status_code == 403
    olga.post_ok('/lessons/l-4/review', {'rating': 5, 'text': TEXT}, 201)
    assert olga.call('post', '/lessons/l-4/review', {'rating': 5, 'text': TEXT}).status_code == 409


def test_rejected_review_stays_hidden_and_tutor_replies_once(world):
    olga, tutor, admin = world['olga'], world['tutor'], world['admin']
    review = olga.post_ok('/lessons/l-4/review', {'rating': 1, 'text': 'Ужасный урок, не советую никому.'}, 201)
    assert tutor.call('post', f'/reviews/{review["id"]}/reply', {'text': 'Спасибо'}).status_code == 400  # ещё не опубликован
    admin.post_ok(f'/admin/reviews/{review["id"]}', {'approve': False})
    assert olga.get_ok('/tutors/english/reviews') == [] and Api().call('get', f'/reviews/{review["id"]}').status_code == 404
    other = olga.post_ok('/lessons/l-5/review', {'rating': 5, 'text': 'Всё отлично, заниматься одно удовольствие.'}, 201)
    admin.post_ok(f'/admin/reviews/{other["id"]}', {'approve': True})
    assert tutor.post_ok(f'/reviews/{other["id"]}/reply', {'text': 'Спасибо большое!'})['reply'] == 'Спасибо большое!'
    assert tutor.call('post', f'/reviews/{other["id"]}/reply', {'text': 'Ещё раз'}).status_code == 409
    assert olga.call('post', f'/reviews/{other["id"]}/reply', {'text': 'Ответ ученика'}).status_code == 403


def test_admin_endpoints_are_admin_only(world):
    for client in (world['olga'], world['tutor'], Api()):
        for path in ('/admin/disputes', '/admin/cancellations', '/admin/reviews', '/admin/profiles'):
            assert client.call('get', path).status_code in (401, 403)


def test_admin_lists_cancellations_with_late_flag(world):
    rows = world['admin'].get_ok('/admin/cancellations')
    assert rows[0]['lessonId'] == 'l-6' and rows[0]['by'] == 'student' and rows[0]['late'] is False


def test_profile_moderation_cycle(world):
    newbie = Api()
    newbie.post_ok('/auth/signup', {'role': 'tutor', 'name': 'Ирина', 'email': 'irina.m@mail.ru', 'password': 'password1'}, 201)
    newbie.call('patch', '/tutor/profile', {'headline': 'Математика', 'about': 'Преподаю математику десять лет', 'subjects': ['Математика'], 'price': 1500, 'introMinutes': 15}, 200)
    newbie.call('put', '/tutor/schedule', {'days': [{'weekday': 1, 'intervals': [{'from': '10:00', 'to': '14:00'}]}]}, 200)
    tutor_id = newbie.post_ok('/tutor/profile/submit')['slug']
    admin = world['admin']
    assert [q['tutorId'] for q in admin.get_ok('/admin/profiles')] == [tutor_id]
    assert admin.call('post', f'/admin/profiles/{tutor_id}', {'approve': False}).status_code == 400
    back = admin.post_ok(f'/admin/profiles/{tutor_id}', {'approve': False, 'note': 'Загрузите фото'})
    assert back['status'] == 'draft' and back['moderationNote'] == 'Загрузите фото'
    assert newbie.get_ok('/tutor/profile')['moderationNote'] == 'Загрузите фото'
    newbie.post_ok('/tutor/profile/submit')
    assert admin.post_ok(f'/admin/profiles/{tutor_id}', {'approve': True})['status'] == 'published'
    assert tutor_id in [t['id'] for t in Api().get_ok('/tutors', {'limit': 50})['items']]
    assert any(n['title'] == 'Анкета опубликована' for n in newbie.get_ok('/me/notifications'))
