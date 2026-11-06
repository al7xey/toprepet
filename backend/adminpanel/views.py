from core.inputs import boolean_input
from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from rest_framework.response import Response
from core.views import AdminAPIView as APIView

from core.errors import ApiError, not_found
from core.audit import record
from core.perm import require_role
from core.utils import iso
from lessons import services as lesson_services
from lessons.models import Dispute, Lesson
from lessons.serializers import dispute_json, lesson_json
from notifications.service import notify
from reviews import services as review_services
from reviews.models import Review
from reviews.views import review_json
from tutors.models import Tutor, TutorDocument
from tutors.serializers import profile_json, document_json


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
        return Response(review_json(review_services.moderate(review_id, boolean_input(request.data, 'approve'), actor=request.user)))


class ProfileQueue(APIView):
    def get(self, request):
        require_role(request, 'admin')
        checking = TutorDocument.objects.filter(tutor=OuterRef('pk'), status='checking')
        tutors = Tutor.objects.annotate(documents_pending=Exists(checking)).filter(Q(status='review') | Q(documents_pending=True)).select_related('user').prefetch_related('documents').order_by('submitted_at')
        return Response([{'tutorId': t.id, 'email': t.user.email if t.user else '', 'submittedAt': iso(t.submitted_at or t.created_at), 'profile': profile_json(t), 'documents': [document_json(d, request) for d in t.documents.all()]} for t in tutors])


class ModerateProfile(APIView):
    @transaction.atomic
    def post(self, request, tutor_id):
        require_role(request, 'admin')
        tutor = Tutor.objects.select_for_update().filter(id=tutor_id).first()
        if tutor is None:
            raise not_found('Анкета не найдена')
        if tutor.status != 'review':
            raise ApiError('Анкета не на проверке')
        approve = boolean_input(request.data, 'approve')
        comment = str(request.data.get('note') or '').strip()
        if not approve and not comment:
            raise ApiError('Напишите, что нужно исправить')
        tutor.status = 'published' if approve else 'draft'
        tutor.moderation_note = '' if approve else comment
        tutor.save(update_fields=['status', 'moderation_note'])
        record(request.user, 'profile.moderate', tutor.pk, tutor.status)
        notify(tutor.user, 'system', 'Анкета опубликована' if approve else 'Анкету нужно доработать', 'Теперь ученики видят вас в каталоге.' if approve else comment, '/tutor/profile')
        return Response(profile_json(tutor))


class ModerateDocument(APIView):
    def post(self, request, document_id):
        from tutors.documents import moderate_document
        admin = require_role(request, 'admin')
        doc = moderate_document(admin, document_id, boolean_input(request.data, 'approve'))
        return Response(document_json(doc, request))


class DocumentQueue(APIView):
    def get(self, request):
        cursor = request.query_params.get('cursor', '')
        if len(cursor) > 40:
            raise ApiError('Неверный курсор')
        query = TutorDocument.objects.filter(status='checking').select_related('tutor')
        if cursor:
            query = query.filter(pk__gt=cursor)
        docs = list(query.order_by('pk')[:101])
        return Response({'items': [{**document_json(doc, request), 'tutorName': doc.tutor.name} for doc in docs[:100]], 'nextCursor': docs[99].pk if len(docs) > 100 else None})
