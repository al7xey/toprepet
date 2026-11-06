import os

from django.db import transaction
from django.db.models import Exists, OuterRef, Q, CharField, IntegerField, Value, F
from django.db.models.functions import Cast, Concat, Replace
from core.expressions import UnicodeLower, JsonText, ArraySubjectMatches, ArrayIncludes
from django.utils import timezone
from rest_framework.response import Response
from core.views import TutorAPIView as APIView, PublicAPIView

from core.errors import ApiError, not_found
from core.perm import my_tutor
from core.utils import parse_iso
from notifications.service import notify_admins
from services.contacts import CONTACTS_MESSAGE, has_contacts
from services.images import save_photo
from services.slots import slots_for

from .models import ScheduleException, Tutor, TutorDocument
from .serializers import (ExceptionIn, ProfilePatchIn, WeekIn, TutorQueryIn, document_json, exception_json, profile_json, slot_json, tutor_json)
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


class TutorListView(PublicAPIView):
    def get(self, request):
        parsed = TutorQueryIn(data=request.query_params)
        parsed.is_valid(raise_exception=True)
        q = parsed.validated_data
        query = norm(q['query'])
        subject = q.get('subject') or None
        price_max, price_min = q.get('priceMax'), q.get('priceMin')
        limit, start = q['limit'], q['cursor']
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
        if q.get('hasIntro'):
            items = items.filter(intro_minutes__gt=0)
        if query:
            items = items.annotate(search_text=Replace(UnicodeLower(Concat('name', Value(' '), 'headline', Value(' '), 'card_subjects', Value(' '), JsonText('help_topics', output_field=CharField()), Value(' '), 'intro', output_field=CharField())), Value('ё'), Value('е'))).filter(search_text__contains=query)
        sort = q.get('sort')
        if sort in ('price_asc', 'price_desc'):
            items = items.order_by('price' if sort == 'price_asc' else '-price', 'sort_order', 'pk')
        total = items.count()
        page = items[start:start + limit]
        return Response({'items': [tutor_json(t) for t in page], 'total': total, 'nextCursor': str(start + limit) if start + limit < total else None})


class TutorDetailView(PublicAPIView):
    def get(self, request, tutor_id):
        return Response(tutor_json(visible_tutor(request, tutor_id)))


class TutorSlotsView(PublicAPIView):
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
    throttle_scope = 'upload'
    def post(self, request):
        my_tutor(request)
        return Response({'url': save_photo(request)})


class DocumentsView(APIView):
    throttle_scope = 'upload'

    def get(self, request):
        return Response([document_json(d, request) for d in my_tutor(request).documents.all()])

    def post(self, request):
        from .documents import upload_document
        return Response(document_json(upload_document(request), request), status=201)


class DocumentDetailView(APIView):
    def delete(self, request, document_id):
        from .documents import delete_document
        delete_document(request, document_id)
        return Response(status=204)


from core.views import APIView as AuthenticatedAPIView


class DocumentFileView(AuthenticatedAPIView):
    def get(self, request, document_id):
        from django.http import FileResponse
        from core.perm import require_user
        user = require_user(request)
        query = TutorDocument.objects.all()
        if user.role != 'admin':
            query = query.filter(tutor__user=user)
        doc = query.filter(pk=document_id).first()
        if doc is None or not doc.file:
            raise not_found('Документ не найден')
        try:
            stream = doc.file.open('rb')
        except FileNotFoundError:
            raise not_found('Документ не найден')
        ext = os.path.splitext(doc.file.name)[1].lower()
        response = FileResponse(stream, as_attachment=True, filename=f'document-{doc.pk}{ext}')
        response['Cache-Control'] = 'no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
