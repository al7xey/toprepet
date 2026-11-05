import io
import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Exists, OuterRef, Q, CharField, IntegerField, Value, F
from django.db.models.functions import Cast, Concat, Replace
from core.expressions import UnicodeLower, JsonText, ArraySubjectMatches, ArrayIncludes
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ApiError, not_found
from core.perm import my_tutor, require_user
from core.utils import parse_iso
from notifications.service import notify, notify_admins
from services.contacts import CONTACTS_MESSAGE, has_contacts
from services.images import save_photo
from services.slots import slots_for

from .models import ScheduleException, Tutor, TutorDocument
from .serializers import (ExceptionIn, ProfilePatchIn, WeekIn, document_json, exception_json, profile_json, slot_json, tutor_json)
from .services import EMPTY_WEEK


def norm(value: str) -> str:
    return value.strip().casefold().replace('ё', 'е')


def visible_tutor(request, tutor_id: str) -> Tutor:
    tutor = Tutor.objects.filter(id=tutor_id).first()
    user = getattr(request, 'user', None)
    own = user and user.is_authenticated and (user.role == 'admin' or getattr(user, 'tutor', None) == tutor)
    if not tutor or (tutor.status != 'published' and not own):
        raise not_found('Анкета не найдена')
    return tutor


class TutorListView(APIView):
    def get(self, request):
        q = request.query_params
        query = norm(q.get('query', ''))
        subject = q.get('subject') or None
        try:
            price_max = int(q['priceMax']) if q.get('priceMax') else None
            price_min = int(q['priceMin']) if q.get('priceMin') else None
            limit = max(1, min(int(q.get('limit', 8)), 50))
            start = max(0, int(q.get('cursor') or 0))
        except ValueError:
            raise ApiError('Неверные параметры поиска')
        items = Tutor.objects.filter(status='published').annotate(
            documents_verified=Exists(TutorDocument.objects.filter(tutor_id=OuterRef('pk'), status='approved')),
            student_amount=Cast((Cast('price', output_field=IntegerField()) * 11 + 5) / 10, output_field=IntegerField()),
        )
        if subject:
            items = items.annotate(
                subject_match=ArraySubjectMatches(F('subjects'), Value(subject)),
                topic_match=ArrayIncludes(F('help_topics'), Value(subject)),
            ).filter(Q(subject_match=True) | Q(topic_match=True))
        if price_max is not None:
            items = items.filter(student_amount__lte=price_max)
        if price_min is not None:
            items = items.filter(student_amount__gte=price_min)
        if q.get('hasIntro') in ('true', '1'):
            items = items.filter(intro_minutes__gt=0)
        if query:
            items = items.annotate(search_text=Replace(UnicodeLower(Concat('name', Value(' '), 'headline', Value(' '), 'card_subjects', Value(' '), JsonText('help_topics', output_field=CharField()), Value(' '), 'intro', output_field=CharField())), Value('ё'), Value('е'))).filter(search_text__contains=query)
        sort = q.get('sort')
        if sort in ('price_asc', 'price_desc'):
            items = items.order_by('price' if sort == 'price_asc' else '-price', 'sort_order', 'pk')
        total = items.count()
        page = items[start:start + limit]
        return Response({'items': [tutor_json(t) for t in page], 'total': total, 'nextCursor': str(start + limit) if start + limit < total else None})


class TutorDetailView(APIView):
    def get(self, request, tutor_id):
        return Response(tutor_json(visible_tutor(request, tutor_id)))


class TutorSlotsView(APIView):
    def get(self, request, tutor_id):
        tutor = visible_tutor(request, tutor_id)
        try:
            start = parse_iso(request.query_params['from']) if request.query_params.get('from') else timezone.now()
            days = max(1, min(int(request.query_params.get('days', 7)), 60))
            duration = int(request.query_params.get('durationMin', 60))
            if not 1 <= duration <= 240:
                raise ValueError('duration')
        except (ValueError, KeyError):
            raise ApiError('Неверные параметры')
        return Response([slot_json(s) for s in slots_for(tutor, start, days, duration_min=duration)])


class MyProfileView(APIView):
    def get(self, request):
        return Response(profile_json(my_tutor(request)))

    @transaction.atomic
    def patch(self, request):
        tutor = my_tutor(request)
        data = ProfilePatchIn(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        for key in ('headline', 'about', 'approach'):
            if key in v and has_contacts(v[key]):
                raise ApiError(CONTACTS_MESSAGE)
        if 'name' in v:
            if not v['name'].strip():
                raise ApiError('Укажите имя')
            tutor.name = v['name'].strip()
        mapping = {'headline': 'headline', 'about': 'intro', 'approach': 'approach', 'experience': 'experience', 'price': 'price', 'introMinutes': 'intro_minutes', 'levels': 'levels', 'durations': 'durations', 'education': 'achievements'}
        for key, attr in mapping.items():
            if key in v:
                setattr(tutor, attr, v[key])
        if 'subjects' in v:
            tutor.subjects = [s.strip() for s in v['subjects'] if s.strip()]
            tutor.help_topics = tutor.subjects
            tutor.card_subjects = ' / '.join(tutor.subjects)
        if 'photo' in v:
            tutor.photo = v['photo'] or ''
            tutor.photo_srcset = ''
        if tutor.status == 'published' and set(v) & {'name', 'headline', 'about', 'approach', 'experience', 'education', 'subjects', 'photo'}:
            tutor.status = 'review'
            tutor.submitted_at = timezone.now()
            notify_admins('system', 'Изменения анкеты ждут проверки', tutor.name, '/admin/profiles')
        tutor.save()
        return Response(profile_json(tutor))


class SubmitProfileView(APIView):
    @transaction.atomic
    def post(self, request):
        tutor = my_tutor(request)
        if not tutor.name.strip() or not tutor.intro.strip() or not tutor.subjects or not tutor.price:
            raise ApiError('Заполните имя, описание, предметы и цену')
        if not any(d.get('intervals') for d in tutor.week or []):
            raise ApiError('Откройте хотя бы одно время для записи в расписании')
        if tutor.status != 'published':
            tutor.status = 'review'
            tutor.submitted_at = timezone.now()
            notify_admins('system', 'Анкета ждёт проверки', f'{tutor.name} отправил анкету', '/admin/profiles')
        tutor.moderation_note = ''
        tutor.save()
        request.user.onboarded = True
        request.user.save(update_fields=['onboarded'])
        return Response(profile_json(tutor))


def _validated_week(payload):
    data = WeekIn(data=payload)
    data.is_valid(raise_exception=True)
    by_day = {d['weekday']: d['intervals'] for d in data.validated_data['days']}
    return [{'weekday': n, 'intervals': sorted(by_day.get(n, []), key=lambda i: i['from'])} for n in range(1, 8)]


class WeekView(APIView):
    def get(self, request):
        tutor = my_tutor(request)
        return Response({'days': tutor.week or EMPTY_WEEK})

    @transaction.atomic
    def put(self, request):
        tutor = my_tutor(request)
        tutor = Tutor.objects.select_for_update().get(pk=tutor.pk)
        tutor.week = _validated_week(request.data)
        tutor.save(update_fields=['week'])
        return Response({'days': tutor.week})


class ExceptionsView(APIView):
    def get(self, request):
        return Response([exception_json(e) for e in my_tutor(request).exceptions.all()])


class ExceptionDetailView(APIView):
    @transaction.atomic
    def put(self, request, date):
        tutor = my_tutor(request)
        tutor = Tutor.objects.select_for_update().get(pk=tutor.pk)
        data = ExceptionIn(data={**request.data, 'date': date})
        data.is_valid(raise_exception=True)
        v = data.validated_data
        ScheduleException.objects.update_or_create(tutor=tutor, date=v['date'], defaults={'kind': v['kind'], 'intervals': v.get('intervals', []) if v['kind'] == 'extra' else []})
        return Response([exception_json(e) for e in tutor.exceptions.all()])

    @transaction.atomic
    def delete(self, request, date):
        tutor = my_tutor(request)
        tutor = Tutor.objects.select_for_update().get(pk=tutor.pk)
        tutor.exceptions.filter(date=date).delete()
        return Response([exception_json(e) for e in tutor.exceptions.all()])


class PhotoView(APIView):
    def post(self, request):
        my_tutor(request)
        return Response({'url': save_photo(request)})


class DocumentsView(APIView):
    def get(self, request):
        return Response([document_json(d) for d in my_tutor(request).documents.all()])

    def post(self, request):
        tutor = my_tutor(request)
        title = str(request.data.get('title', '')).strip()
        file = request.FILES.get('file')
        if not title:
            raise ApiError('Назовите документ')
        if file is not None:
            if file.size > 10_000_000:
                raise ApiError('Файл больше 10 МБ')
            ext = os.path.splitext(file.name)[1].lower()
            if ext not in ('.pdf', '.jpg', '.jpeg', '.png', '.webp'):
                raise ApiError('Подойдут PDF и изображения')
        doc = TutorDocument.objects.create(tutor=tutor, title=title[:200], file=file, status='checking')
        return Response(document_json(doc), status=201)
