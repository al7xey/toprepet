from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ApiError
from core.perm import require_role, require_user

from . import services
from .models import Lesson
from .serializers import BookingIn, ProblemIn, ReasonIn, dispute_json, lesson_json


class BookingView(APIView):
    def post(self, request):
        user = require_user(request)
        data = BookingIn(data=request.data)
        data.is_valid(raise_exception=True)
        lesson = services.create_booking(user, data.validated_data, request.headers.get('Idempotency-Key', '')[:64])
        return Response(lesson_json(lesson, user), status=201)


class MyLessonsView(APIView):
    def get(self, request):
        user = require_user(request)
        scope = request.query_params.get('scope', 'upcoming')
        now = timezone.now()
        lessons = list(services.visible_lessons(user).select_related('tutor', 'student')) if user.role != 'admin' else []
        active = lambda l: l.status in Lesson.ACTIVE and l.end > now
        items = [l for l in lessons if (active(l) if scope == 'upcoming' else not active(l))]
        items.sort(key=lambda l: l.start, reverse=(scope != 'upcoming'))
        return Response([lesson_json(l, user) for l in items])


class LessonView(APIView):
    def get(self, request, lesson_id):
        user = require_user(request)
        return Response(lesson_json(services.get_lesson(user, lesson_id), user))


class CancelView(APIView):
    def post(self, request, lesson_id):
        user = require_user(request)
        data = ReasonIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(lesson_json(services.cancel(user, lesson_id, data.validated_data['reason']), user))


class MoveView(APIView):
    def post(self, request, lesson_id):
        user = require_user(request)
        from rest_framework import serializers
        field = serializers.DateTimeField()
        try:
            start = field.run_validation(request.data.get('start'))
        except serializers.ValidationError:
            raise ApiError('Выберите время')
        return Response(lesson_json(services.propose_move(user, lesson_id, start), user))


class MoveAnswerView(APIView):
    def post(self, request, lesson_id):
        user = require_user(request)
        return Response(lesson_json(services.answer_move(user, lesson_id, bool(request.data.get('accept'))), user))


class ConfirmView(APIView):
    def post(self, request, lesson_id):
        user = require_role(request, 'tutor')
        return Response(lesson_json(services.confirm(user, lesson_id), user))


class DeclineView(APIView):
    def post(self, request, lesson_id):
        user = require_role(request, 'tutor')
        data = ReasonIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(lesson_json(services.decline(user, lesson_id, data.validated_data['reason']), user))


class ResultView(APIView):
    def post(self, request, lesson_id):
        user = require_user(request)
        result = request.data.get('result')
        if result not in ('happened', 'no_show_student', 'no_show_tutor'):
            raise ApiError('Неизвестный итог урока')
        return Response(lesson_json(services.mark_result(user, lesson_id, result), user))


class ProblemView(APIView):
    def post(self, request, lesson_id):
        user = require_role(request, 'student')
        data = ProblemIn(data=request.data)
        data.is_valid(raise_exception=True)
        return Response(dispute_json(services.report_problem(user, lesson_id, **data.validated_data)), status=201)


class DisputeView(APIView):
    def get(self, request, dispute_id):
        return Response(dispute_json(services.get_dispute(require_user(request), dispute_id)))


class DisputeReplyView(APIView):
    def post(self, request, dispute_id):
        user = require_role(request, 'tutor')
        text = str(request.data.get('text', '')).strip()
        if not text:
            raise ApiError('Напишите ответ')
        return Response(dispute_json(services.reply_dispute(user, dispute_id, text[:3000])))


class MyStudentsView(APIView):
    def get(self, request):
        user = require_role(request, 'tutor')
        groups = {}
        for lesson in Lesson.objects.filter(tutor__user=user).select_related('student').order_by('start'):
            groups.setdefault(lesson.student_id, []).append(lesson)
        now = timezone.now()
        out = []
        for student_id, lessons in groups.items():
            upcoming = sorted(l.start for l in lessons if l.start > now and l.status in Lesson.ACTIVE)
            from core.utils import iso
            out.append({'id': student_id, 'name': lessons[0].student.name, 'note': lessons[0].subject, 'lessonsCount': sum(1 for l in lessons if l.status == 'completed'), 'nextLesson': iso(upcoming[0]) if upcoming else None})
        return Response(out)


class MyTutorsView(APIView):
    def get(self, request):
        user = require_role(request, 'student')
        from core.utils import iso
        groups = {}
        for lesson in Lesson.objects.filter(student=user).select_related('tutor').order_by('start'):
            groups.setdefault(lesson.tutor_id, []).append(lesson)
        out = []
        for tutor_id, lessons in groups.items():
            done = [l for l in lessons if l.status == 'completed']
            out.append({'tutorId': tutor_id, 'name': lessons[0].tutor.name, 'photo': lessons[0].tutor.photo, 'subject': lessons[0].subject, 'lessonsCount': len(done), 'lastLesson': iso(done[-1].start) if done else None})
        return Response(out)
