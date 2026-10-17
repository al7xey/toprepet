from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import not_found
from core.perm import require_role, require_user
from core.utils import iso
from tutors.models import Tutor

from . import services
from .models import Review


def review_json(r) -> dict:
    return {'id': r.id, 'lessonId': r.lesson_id, 'tutorId': r.tutor_id, 'authorName': r.author_name, 'authorNote': r.author_note, 'rating': r.rating,
            'text': r.text, 'status': r.status, 'createdAt': iso(r.created_at), 'reply': r.reply or None}


class TutorReviewsView(APIView):
    def get(self, request, tutor_id):
        if not Tutor.objects.filter(id=tutor_id, status='published').exists():
            raise not_found('Анкета не найдена')
        return Response([review_json(r) for r in Review.objects.filter(tutor_id=tutor_id, status='published')])


class LessonReviewView(APIView):
    def post(self, request, lesson_id):
        user = require_role(request, 'student')
        rating = request.data.get('rating')
        review = services.create_review(user, lesson_id, rating if isinstance(rating, int) and not isinstance(rating, bool) else None, str(request.data.get('text', '')))
        return Response(review_json(review), status=201)


class ReviewView(APIView):
    def get(self, request, review_id):
        user = require_user(request) if request.user and request.user.is_authenticated else None
        review = Review.objects.select_related('tutor', 'lesson').filter(id=review_id).first()
        allowed = review and (review.status == 'published' or (user and (user.role == 'admin' or review.lesson.student_id == user.id or review.tutor.user_id == user.id)))
        if not allowed:
            raise not_found('Отзыв не найден')
        return Response(review_json(review))


class MyReviewsView(APIView):
    def get(self, request):
        user = require_role(request, 'tutor')
        return Response([review_json(r) for r in Review.objects.filter(tutor__user=user, status='published')])


class ReplyView(APIView):
    def post(self, request, review_id):
        user = require_role(request, 'tutor')
        return Response(review_json(services.reply(user, review_id, str(request.data.get('text', '')))))
