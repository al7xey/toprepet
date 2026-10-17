"""Демо-данные: те же репетиторы, пользователи и ID, что в моке фронтенда (src/new-design/api/mock.ts)."""
import json
from datetime import datetime, timedelta, timezone as dt_timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from chats.models import Conversation, Message
from lessons.models import Lesson
from notifications.models import Notification
from payments.models import Card, PaymentRecord
from requests_board.models import RequestResponse, StudyRequest
from tutors.models import Tutor, TutorDocument

FIXTURE = Path(__file__).resolve().parents[2] / 'fixtures' / 'demo_tutors.json'
MSK = ZoneInfo('Europe/Moscow')
HOUR, DAY = timedelta(hours=1), timedelta(days=1)
DEFAULT_WEEK = [{'weekday': d, 'intervals': [{'from': '17:00', 'to': '21:00'}] if d <= 5 else [{'from': '10:00', 'to': '14:00'}] if d == 6 else []} for d in range(1, 8)]


def at(days: int, hour: int) -> datetime:
    day = (timezone.now().astimezone(MSK) + timedelta(days=days)).date()
    return datetime(day.year, day.month, day.day, hour, tzinfo=MSK).astimezone(dt_timezone.utc)


def set_time(model, pk, **fields):
    """auto_now_add нельзя задать при создании, поэтому правим время запросом."""
    model.objects.filter(pk=pk).update(**fields)


class Command(BaseCommand):
    help = 'Заполняет базу демо-данными. --reset стирает существующие данные.'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true')

    @transaction.atomic
    def handle(self, *args, **opts):
        if User.objects.filter(email='olga@mail.ru').exists():
            if not opts['reset']:
                self.stdout.write('Демо-данные уже есть (используйте --reset, чтобы пересоздать).')
                return
            for model in (Message, Conversation, PaymentRecord, Card, Notification, RequestResponse, StudyRequest, Lesson, TutorDocument, Tutor, User):
                model.objects.all().delete()
        now = timezone.now()
        student = User.objects.create_user('olga@mail.ru', 'demo', id='u-student', name='Ольга', role='student', email_verified=True, onboarded=True)
        tutor_user = User.objects.create_user('anastasia@toprepet.ru', 'demo', id='u-tutor', name='Анастасия', role='tutor', email_verified=True, onboarded=True)
        User.objects.create_user('admin@toprepet.ru', 'demo', id='u-admin', name='Поддержка', role='admin', email_verified=True, onboarded=True, is_staff=True)
        other = [User.objects.create_user('irina.demo@mail.ru', 'demo', id='u-other', name='Ирина', role='student', email_verified=True, onboarded=True),
                 User.objects.create_user('sergey.demo@mail.ru', 'demo', id='u-other2', name='Сергей', role='student', email_verified=True, onboarded=True)]

        tutors = []
        for item in json.loads(FIXTURE.read_text(encoding='utf8')):
            tutors.append(Tutor.objects.create(
                id=item['id'], name=item['name'], photo=item['photo'], photo_srcset=item.get('photoSrcSet', ''), headline=item['headline'],
                subjects=item['subjects'], card_subjects=item['cardSubjects'], help_topics=item['helpTopics'], experience=item['experience'],
                intro=item['intro'], approach=item['approach'], achievements=item['achievements'], price=item['price'],
                intro_minutes=item['introMinutes'], status='published', timezone=item['timezone'], week=DEFAULT_WEEK, sort_order=item['sortOrder'],
                durations=[60],
            ))
        anastasia = tutors[0]
        anastasia.user = tutor_user
        anastasia.save(update_fields=['user'])
        for tutor in tutors[1:]:  # у остальных демо-репетиторов есть аккаунты без пароля: им приходят уведомления и сообщения
            tutor.user = User.objects.create_user(f'{tutor.id}@demo.toprepet.ru', None, id=f'u-{tutor.id}', name=tutor.name, role='tutor', email_verified=True, onboarded=True)
            tutor.save(update_fields=['user'])
        TutorDocument.objects.create(id='d-1', tutor=anastasia, title='Диплом бакалавра', status='approved')
        TutorDocument.objects.create(id='d-2', tutor=anastasia, title='Сертификат Cambridge FCE', status='checking')

        def lesson(pk, tutor, start, status, **extra):
            payment = {'pending': 'hold', 'confirmed': 'captured', 'completed': 'paid_out'}.get(status, 'refunded')
            fields = dict(id=pk, kind='regular', tutor=tutor, student=student, subject=tutor.subjects[0], start=start, duration_min=60, status=status,
                          price=tutor.student_price, tutor_price=tutor.price, payment=payment, meeting_url='')
            if status == 'pending':
                fields['confirm_by'] = min(start - 2 * HOUR, now + DAY)
            fields.update(extra)
            return Lesson.objects.create(**fields)

        lesson('l-1', anastasia, at(1, 19), 'confirmed', meeting_url='https://telemost.yandex.ru/')
        lesson('l-2', anastasia, at(3, 19), 'pending')
        lesson('l-3', tutors[1], at(5, 17), 'confirmed', kind='intro', price=0, tutor_price=0, payment='none', duration_min=tutors[1].intro_minutes, subject=tutors[1].subjects[0])
        lesson('l-4', anastasia, at(-2, 19), 'completed')
        lesson('l-5', anastasia, at(-9, 19), 'completed')
        lesson('l-7', anastasia, now - 3 * HOUR, 'completed', payment='captured')
        lesson('l-6', tutors[5], at(-5, 16), 'cancelled', cancelled_by='student', cancel_reason='Заболел ребёнок', payment='refunded')

        Card.objects.create(id='card-1', user=student, brand='МИР', last4='4417', primary=True)
        for pk, lesson_id, kind, ago, tutor in (('p-1', 'l-2', 'hold', 3 * HOUR, anastasia), ('p-2', 'l-1', 'charge', DAY, anastasia), ('p-3', 'l-6', 'refund', 5 * DAY, tutors[5])):
            PaymentRecord.objects.create(id=pk, user=student, lesson_id=lesson_id, title=f'Урок с {tutor.name}', amount=tutor.student_price, kind=kind, card_last4='4417')
            set_time(PaymentRecord, pk, at=now - ago)

        for pk, tutor, last, unread, ago in (('c-1', anastasia, 'Отлично, тогда до четверга!', 1, 2 * HOUR), ('c-2', tutors[1], 'Здравствуйте! Знакомство подтвердила.', 0, DAY)):
            Conversation.objects.create(id=pk, tutor=tutor, student=student, last_message=last, unread_student=unread)
            set_time(Conversation, pk, updated_at=now - ago)
        for pk, conv, author, text, ago, kind in (
            ('m-1', 'c-1', None, 'Ольга записалась на урок английского', 26 * HOUR, 'event'),
            ('m-2', 'c-1', student, 'Здравствуйте! Хотим подтянуть грамматику перед контрольной.', 25 * HOUR, 'text'),
            ('m-3', 'c-1', tutor_user, 'Здравствуйте! Хорошо, начнём с повторения времён. Пришлите, пожалуйста, тему контрольной.', 24 * HOUR, 'text'),
            ('m-4', 'c-1', None, 'Анастасия подтвердила урок', 23 * HOUR, 'event'),
            ('m-5', 'c-1', tutor_user, 'Отлично, тогда до четверга!', 2 * HOUR, 'text'),
            ('m-6', 'c-2', None, 'Ольга записалась на бесплатное знакомство', 30 * HOUR, 'event'),
            ('m-7', 'c-2', tutors[1].user, 'Здравствуйте! Знакомство подтвердила.', DAY, 'text'),
        ):
            Message.objects.create(id=pk, conversation_id=conv, author=author, text=text, kind=kind)
            set_time(Message, pk, at=now - ago)

        base = dict(level='9 класс', budget_max=1800, schedule=['Будни вечером'], status='open')
        StudyRequest.objects.create(id='r-1', student=student, subject='Математика', goal='Подготовка к ОГЭ', description='Нужно подтянуть геометрию и вторую часть ОГЭ. Удобно 2 раза в неделю.', expires_at=now + 12 * DAY, **base)
        StudyRequest.objects.create(id='r-2', student=other[0], subject='Английский язык', goal='Разговорный английский', level='Взрослый, A2', budget_max=2000, schedule=['Выходные'],
                                    description='Хочу свободнее говорить на работе, нужна разговорная практика.', expires_at=now + 10 * DAY, status='open')
        StudyRequest.objects.create(id='r-3', student=other[1], subject='Английский язык', goal='Домашние задания', level='6 класс', budget_max=None, schedule=['Будни днём'],
                                    description='Помогите сыну с домашними заданиями по английскому.', expires_at=now + 14 * DAY, status='open')
        for pk, ago in (('r-1', 2 * DAY), ('r-2', DAY), ('r-3', 5 * HOUR)):
            set_time(StudyRequest, pk, created_at=now - ago)
        ervan = next((t for t in tutors if 'Математика' in t.subjects), tutors[0])
        daria = next((t for t in tutors if t.id.startswith('physics')), tutors[1])
        for pk, tutor, text, ago in (('rr-1', ervan, 'Готовлю к ОГЭ третий год. Начнём с диагностики и составим план по геометрии.', 20 * HOUR),
                                     ('rr-2', daria, 'Могу два раза в неделю вечером. Разберём вторую часть на примерах прошлых лет.', 6 * HOUR)):
            RequestResponse.objects.create(id=pk, request_id='r-1', tutor=tutor, price=tutor.student_price, message=text, slots=[at(2, 18).isoformat(), at(4, 18).isoformat()])
            set_time(RequestResponse, pk, created_at=now - ago)

        for pk, user, kind, title, text, ago, link, read in (
            ('n-1', student, 'lesson', 'Урок подтверждён', 'Анастасия подтвердила урок', 23 * HOUR, '/me/lessons/l-1', False),
            ('n-2', student, 'request', 'Новый отклик на заявку', 'По заявке «Математика» откликнулись 2 репетитора', 6 * HOUR, '/me/requests/r-1', False),
            ('n-3', student, 'message', 'Новое сообщение', 'Анастасия: Отлично, тогда до четверга!', 2 * HOUR, '/me/chats/c-1', False),
            ('n-4', tutor_user, 'lesson', 'Новая запись', 'Ольга записалась на урок. Подтвердите до срока.', 3 * HOUR, '/tutor/lessons/l-2', False),
            ('n-5', tutor_user, 'request', 'Новая заявка по вашему предмету', 'Английский язык, разговорная практика', DAY, '/tutor/requests/r-2', True),
        ):
            Notification.objects.create(id=pk, user=user, kind=kind, title=title, text=text, link=link, read=read)
            set_time(Notification, pk, at=now - ago)
        self.stdout.write(self.style.SUCCESS('Демо-данные созданы: olga@mail.ru, anastasia@toprepet.ru, admin@toprepet.ru (пароль demo).'))
