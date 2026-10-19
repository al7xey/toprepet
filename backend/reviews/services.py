from django.db import transaction
from django.db.models import Avg, Count

from core.errors import ApiError, forbidden, not_found
from lessons.models import Lesson
from notifications.service import notify, notify_admins
from services.contacts import CONTACTS_MESSAGE, has_contacts

from .models import Review



@transaction.atomic
def create_review(user, lesson_id: str, rating, text: str) -> Review:
    lesson = Lesson.objects.select_for_update().select_related('tutor', 'student').filter(id=lesson_id, student=user).first()
    if lesson is None:
        raise forbidden('Отзыв оставляет ученик урока')
    if lesson.status != 'completed' or lesson.kind != 'regular':
        raise ApiError('Отзыв можно оставить после проведённого оплаченного урока')
    if Review.objects.filter(lesson=lesson).exists():
        raise ApiError('Отзыв уже оставлен', 409, 'review_exists')
    if not isinstance(rating, int) or not 1 <= rating <= 5:
        raise ApiError('Поставьте оценку от 1 до 5')
    text = (text or '').strip()
    if not text:
        raise ApiError('Напишите отзыв')
    if has_contacts(text):
        raise ApiError(CONTACTS_MESSAGE)
    review = Review.objects.create(lesson=lesson, tutor=lesson.tutor, author_name=user.name, author_note=lesson.subject, rating=rating, text=text[:2000])
    notify_admins('review', 'Отзыв ждёт проверки', f'{user.name} о {lesson.tutor.name}, оценка {rating}', '/admin/reviews')
    return review


def recalc_rating(tutor):
    stats = Review.objects.filter(tutor=tutor, status='published').aggregate(avg=Avg('rating'), n=Count('id'))
    tutor.reviews_count = stats['n']
    tutor.rating = round(stats['avg'], 1) if stats['avg'] is not None else None
    tutor.save(update_fields=['rating', 'reviews_count'])


@transaction.atomic
def moderate(review_id: str, approve: bool) -> Review:
    review = Review.objects.select_for_update().select_related('tutor', 'lesson__student').filter(id=review_id).first()
    if review is None:
        raise not_found('Отзыв не найден')
    if review.status != 'pending':
        raise ApiError('Отзыв уже проверен')
    review.status = 'published' if approve else 'rejected'
    review.save(update_fields=['status'])
    student, tutor = review.lesson.student, review.tutor
    if approve:
        recalc_rating(tutor)
        notify(student, 'review', 'Отзыв опубликован', f'Спасибо! Ваш отзыв о {tutor.name} виден в анкете.', f'/teachers/{tutor.id}')
        notify(tutor.user, 'review', 'Новый отзыв', f'{review.author_name}: оценка {review.rating}', '/tutor/reviews')
    else:
        notify(student, 'review', 'Отзыв не прошёл проверку', 'Он нарушает правила публикации.', None)
    return review


@transaction.atomic
def reply(user, review_id: str, text: str) -> Review:
    review = Review.objects.select_for_update().select_related('tutor', 'lesson__student').filter(id=review_id).first()
    if review is None or review.tutor.user_id != user.id:
        raise not_found('Отзыв не найден')
    if review.status != 'published':
        raise ApiError('Отвечать можно на опубликованные отзывы')
    if review.reply:
        raise ApiError('Вы уже ответили на этот отзыв', 409, 'reply_exists')
    text = text.strip()
    if not text:
        raise ApiError('Напишите ответ')
    if has_contacts(text):
        raise ApiError(CONTACTS_MESSAGE)
    review.reply = text[:1000]
    review.save(update_fields=['reply'])
    notify(review.lesson.student, 'review', 'Репетитор ответил на отзыв', f'{review.tutor.name} ответил на ваш отзыв.', f'/teachers/{review.tutor_id}')
    return review
