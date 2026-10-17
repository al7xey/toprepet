from rest_framework import serializers

from core.utils import iso


def lesson_json(lesson, viewer) -> dict:
    """Урок глазами пользователя. Ученик не видит «цену репетитора», репетитор — цену ученика: сервисный сбор показывает только админка."""
    role = viewer.role
    price, tutor_price = lesson.price, lesson.tutor_price
    if role == 'student':
        tutor_price = price
    elif role == 'tutor':
        price = tutor_price
    data = {
        'id': lesson.id, 'kind': lesson.kind, 'tutorId': lesson.tutor_id, 'tutorName': lesson.tutor.name, 'tutorPhoto': lesson.tutor.photo,
        'studentId': lesson.student_id, 'studentName': lesson.student.name, 'subject': lesson.subject, 'start': iso(lesson.start),
        'durationMin': lesson.duration_min, 'status': lesson.status, 'price': price, 'tutorPrice': tutor_price, 'payment': lesson.payment,
        'meetingUrl': lesson.meeting_url or None, 'moveProposal': {'start': iso(lesson.move_start), 'by': lesson.move_by} if lesson.move_start else None,
        'reviewId': _reverse_id(lesson, 'review'), 'disputeId': _reverse_id(lesson, 'dispute'), 'seriesId': lesson.series_id or None,
    }
    if lesson.confirm_by and lesson.status == 'pending':
        data['confirmBy'] = iso(lesson.confirm_by)
    if lesson.cancel_reason:
        data['cancelReason'] = lesson.cancel_reason
    if lesson.cancelled_by:
        data['cancelledBy'] = lesson.cancelled_by
    if lesson.decline_reason:
        data['declineReason'] = lesson.decline_reason
    return data


def _reverse_id(lesson, name):
    try:
        return getattr(lesson, name).id
    except Exception:
        return None


def dispute_json(d) -> dict:
    return {'id': d.id, 'lessonId': d.lesson_id, 'reason': d.reason, 'text': d.text, 'status': d.status, 'createdAt': iso(d.created_at),
            'tutorReply': d.tutor_reply or None, 'resolution': d.resolution or None}


class BookingIn(serializers.Serializer):
    tutorId = serializers.CharField()
    kind = serializers.ChoiceField(choices=['intro', 'regular'])
    start = serializers.DateTimeField()
    durationMin = serializers.IntegerField(min_value=15, max_value=240)
    subject = serializers.CharField(max_length=120)
    cardId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    requestId = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ReasonIn(serializers.Serializer):
    reason = serializers.CharField(allow_blank=True, required=False, default='', max_length=1000)


class ProblemIn(serializers.Serializer):
    reason = serializers.CharField(max_length=200)
    text = serializers.CharField(max_length=3000)
