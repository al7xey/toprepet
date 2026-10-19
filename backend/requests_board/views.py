from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ApiError, forbidden, not_found
from core.perm import my_tutor, require_role, require_user
from core.utils import iso, parse_iso
from notifications.service import notify
from services.contacts import CONTACTS_MESSAGE, has_contacts
from tutors.models import student_price

from .models import RequestResponse, StudyRequest

MAX_OPEN = 5


def effective_status(r) -> str:
    return 'expired' if r.status == 'open' and r.expires_at < timezone.now() else r.status


def request_subjects(r) -> list:
    """Предметы заявки; у старых заявок только один предмет."""
    return list(r.subjects) if r.subjects else [r.subject]


def request_json(r, short_name: bool = False) -> dict:
    name = r.student.name
    return {'id': r.id, 'studentId': r.student_id, 'studentName': name.split(' ')[0] if short_name else name, 'studentPhoto': r.student.photo or None, 'subject': r.subject, 'subjects': request_subjects(r), 'customSubject': r.custom_subject, 'goal': r.goal, 'level': r.level,
            'budgetMax': r.budget_max, 'schedule': r.schedule, 'description': r.description, 'status': effective_status(r), 'createdAt': iso(r.created_at),
            'expiresAt': iso(r.expires_at), 'responsesCount': r.responses.count()}


def response_json(x) -> dict:
    return {'id': x.id, 'requestId': x.request_id, 'tutorId': x.tutor_id, 'tutorName': x.tutor.name, 'tutorPhoto': x.tutor.photo,
            'tutorRating': float(x.tutor.rating) if x.tutor.rating is not None else None, 'price': x.price, 'message': x.message, 'slots': x.slots,
            'status': x.status, 'createdAt': iso(x.created_at)}


def own_request(user, request_id: str) -> StudyRequest:
    r = StudyRequest.objects.select_related('student').filter(id=request_id, student=user).first()
    if r is None:
        raise not_found('Заявка не найдена')
    return r


def tutor_subjects(user) -> list:
    tutor = getattr(user, 'tutor', None)
    return list(tutor.subjects) if tutor else []


def matches_subjects(subject: str, subjects: list) -> bool:
    return any(subject.startswith(name) for name in subjects)


def visible_to_tutor(r, tutor_subs: list) -> bool:
    """Заявку со своим предметом видят все репетиторы; остальные — только по предметам анкеты."""
    return bool(r.custom_subject) or any(matches_subjects(s, tutor_subs) for s in request_subjects(r))


class RequestsView(APIView):
    def get(self, request):
        """Лента открытых заявок, только для вошедших. Репетитор видит заявки по предметам своей анкеты."""
        user = require_user(request)
        subject = request.query_params.get('subject')
        items = list(StudyRequest.objects.filter(status='open', expires_at__gt=timezone.now()).select_related('student'))
        if user.role == 'tutor':
            mine = tutor_subjects(user)
            items = [r for r in items if visible_to_tutor(r, mine)]
        if subject:
            items = [r for r in items if subject in request_subjects(r)]
        return Response([request_json(r, short_name=True) for r in items[:100]])

    @transaction.atomic
    def post(self, request):
        user = require_role(request, 'student')
        d = request.data
        subjects = d.get('subjects')
        if subjects is None and d.get('subject'):
            subjects = [d.get('subject')]
        if not isinstance(subjects, list) or not all(isinstance(s, str) for s in subjects):
            raise ApiError('Выберите предмет')
        subjects = [s.strip()[:80] for s in subjects if s.strip()][:12]
        custom = str(d.get('customSubject', '')).strip()[:120]
        description = str(d.get('description', '')).strip()
        if not subjects and not custom:
            raise ApiError('Выберите предмет или напишите свой')
        if not description:
            raise ApiError('Опишите задачу')
        if custom and has_contacts(custom):
            raise ApiError(CONTACTS_MESSAGE)
        subject = ', '.join([*subjects, custom] if custom else subjects)
        if has_contacts(description):
            raise ApiError(CONTACTS_MESSAGE)
        budget = d.get('budgetMax')
        if budget is not None and (not isinstance(budget, int) or isinstance(budget, bool) or budget < 0):
            raise ApiError('Бюджет — целое число рублей')
        schedule = d.get('schedule') or []
        if not isinstance(schedule, list) or not all(isinstance(s, str) for s in schedule):
            raise ApiError('Неверное удобное время')
        if StudyRequest.objects.filter(student=user, status='open', expires_at__gt=timezone.now()).count() >= MAX_OPEN:
            raise ApiError(f'Одновременно можно держать до {MAX_OPEN} открытых заявок. Закройте ненужные.', 409, 'too_many')
        r = StudyRequest.objects.create(student=user, subject=subject[:120], subjects=subjects, custom_subject=custom, goal=str(d.get('goal', ''))[:200], level=str(d.get('level', ''))[:120], budget_max=budget,
                                        schedule=schedule[:7], description=description[:3000], expires_at=timezone.now() + timedelta(days=14))
        return Response(request_json(r), status=201)


class MyRequestsView(APIView):
    def get(self, request):
        user = require_role(request, 'student')
        return Response([request_json(r) for r in StudyRequest.objects.filter(student=user).select_related('student')])


class RequestDetailView(APIView):
    def get(self, request, request_id):
        user = require_user(request)
        r = StudyRequest.objects.select_related('student').filter(id=request_id).first()
        if r is None or (user.role == 'student' and r.student_id != user.id):
            raise not_found('Заявка не найдена')
        return Response(request_json(r, short_name=user.role != 'admin' and r.student_id != user.id))


class CloseRequestView(APIView):
    def post(self, request, request_id):
        user = require_role(request, 'student')
        r = own_request(user, request_id)
        if effective_status(r) != 'open':
            raise ApiError('Заявка уже закрыта')
        r.status = 'closed'
        r.save(update_fields=['status'])
        return Response(request_json(r))


class ResponsesView(APIView):
    def get(self, request, request_id):
        user = require_role(request, 'student')
        r = own_request(user, request_id)
        return Response([response_json(x) for x in r.responses.select_related('tutor')])

    @transaction.atomic
    def post(self, request, request_id):
        tutor = my_tutor(request)
        r = StudyRequest.objects.select_for_update().select_related('student').filter(id=request_id).first()
        if r is None:
            raise not_found('Заявка не найдена')
        if tutor.status != 'published':
            raise ApiError('Опубликуйте анкету, чтобы откликаться на заявки')
        if effective_status(r) != 'open':
            raise ApiError('Заявка уже закрыта')
        if not visible_to_tutor(r, tutor.subjects):
            raise forbidden('Эта заявка по другому предмету: откликаться можно только по предметам вашей анкеты')
        message = str(request.data.get('message', '')).strip()
        if not message:
            raise ApiError('Напишите ученику сообщение')
        if has_contacts(message):
            raise ApiError(CONTACTS_MESSAGE)
        price = request.data.get('price')
        if not isinstance(price, int) or isinstance(price, bool) or price < 300:
            raise ApiError('Укажите цену от 300 ₽')
        if RequestResponse.objects.filter(request=r, tutor=tutor).exists():
            raise ApiError('Вы уже откликнулись на эту заявку', 409, 'already_responded')
        slots = request.data.get('slots') or []
        try:
            slots = [iso(parse_iso(s)) for s in slots][:6]
        except (TypeError, ValueError):
            raise ApiError('Неверное время в отклике')
        x = RequestResponse.objects.create(request=r, tutor=tutor, price=student_price(price), message=message[:2000], slots=slots)
        notify(r.student, 'request', 'Новый отклик на заявку', f'{tutor.name} откликнулась на заявку', f'/me/requests/{r.id}')
        return Response(response_json(x), status=201)


class MyResponsesView(APIView):
    def get(self, request):
        tutor = my_tutor(request)
        items = RequestResponse.objects.filter(tutor=tutor).select_related('tutor', 'request__student').order_by('-created_at')
        return Response([{**response_json(x), 'request': request_json(x.request, short_name=True)} for x in items])
