from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ApiError, not_found
from core.perm import require_role
from core.utils import iso
from lessons import services as lesson_services
from lessons.models import Dispute, Lesson
from lessons.serializers import dispute_json, lesson_json
from notifications.service import notify
from reviews import services as review_services
from reviews.models import Review
from reviews.views import review_json
from tutors.models import Tutor
from tutors.serializers import profile_json


class Cancellations(APIView):
    def get(self, request):
        require_role(request, 'admin')
        lessons = Lesson.objects.filter(status='cancelled').select_related('tutor', 'student').order_by('-start')
        return Response([{'lessonId': l.id, 'tutorName': l.tutor.name, 'studentName': l.student.name, 'by': l.cancelled_by or 'student', 'reason': l.cancel_reason,
                          'at': iso(l.start), 'late': l.payment == 'captured'} for l in lessons])


class Disputes(APIView):
    def get(self, request):
        admin = require_role(request, 'admin')
        items = Dispute.objects.select_related('lesson__tutor', 'lesson__student').order_by('-created_at')
        return Response([{**dispute_json(d), 'lesson': lesson_json(d.lesson, admin)} for d in items])


class ResolveDispute(APIView):
    def post(self, request, dispute_id):
        admin = require_role(request, 'admin')
        outcome = request.data.get('outcome')
        if outcome not in ('refund', 'pay'):
            raise ApiError('Выберите решение: вернуть деньги или выплатить репетитору')
        return Response(dispute_json(lesson_services.resolve_dispute(admin, dispute_id, outcome)))


class ReviewQueue(APIView):
    def get(self, request):
        require_role(request, 'admin')
        return Response([review_json(r) for r in Review.objects.filter(status='pending').order_by('created_at')])


class ModerateReview(APIView):
    def post(self, request, review_id):
        require_role(request, 'admin')
        return Response(review_json(review_services.moderate(review_id, bool(request.data.get('approve')))))


class ProfileQueue(APIView):
    def get(self, request):
        require_role(request, 'admin')
        tutors = Tutor.objects.filter(status='review').select_related('user').order_by('submitted_at')
        return Response([{'tutorId': t.id, 'email': t.user.email if t.user else '', 'submittedAt': iso(t.submitted_at or t.created_at), 'profile': profile_json(t)} for t in tutors])


class ModerateProfile(APIView):
    @transaction.atomic
    def post(self, request, tutor_id):
        require_role(request, 'admin')
        tutor = Tutor.objects.select_for_update().filter(id=tutor_id).first()
        if tutor is None:
            raise not_found('Анкета не найдена')
        if tutor.status != 'review':
            raise ApiError('Анкета не на проверке')
        approve = bool(request.data.get('approve'))
        comment = str(request.data.get('note') or '').strip()
        if not approve and not comment:
            raise ApiError('Напишите, что нужно исправить')
        tutor.status = 'published' if approve else 'draft'
        tutor.moderation_note = '' if approve else comment
        tutor.save(update_fields=['status', 'moderation_note'])
        notify(tutor.user, 'system', 'Анкета опубликована' if approve else 'Анкету нужно доработать', 'Теперь ученики видят вас в каталоге.' if approve else comment, '/tutor/profile')
        return Response(profile_json(tutor))
