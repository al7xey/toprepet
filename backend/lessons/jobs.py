"""Задания по расписанию (`manage.py run_jobs`, раз в минуту): всё, что должно происходить само, когда никто не нажимает кнопки."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from notifications.service import notify
from payments import service as money

from .models import Lesson

AUTO_COMPLETE_AFTER = timedelta(hours=24)
PAYOUT_AFTER = timedelta(hours=24)


def expire_unconfirmed(now) -> int:
    """Репетитор не ответил до `confirm_by`: запись отменяется, заморозка снимается."""
    count = 0
    for lesson in Lesson.objects.filter(status='pending', confirm_by__lt=now).select_related('tutor', 'student'):
        with transaction.atomic():
            lesson = Lesson.objects.select_for_update().select_related('tutor', 'student').get(id=lesson.id)
            if lesson.status != 'pending':
                continue
            lesson.status = 'expired'
            money.release(lesson)
            lesson.save()
            notify(lesson.student, 'lesson', 'Репетитор не ответил', 'Запись отменена, деньги разморожены.', f'/me/lessons/{lesson.id}')
            count += 1
    return count


def auto_complete(now) -> int:
    """Если никто не отметил итог урока за сутки и спора нет, считаем, что урок состоялся."""
    count = 0
    for lesson in Lesson.objects.filter(status='confirmed'):
        if lesson.end + AUTO_COMPLETE_AFTER < now:
            lesson.status = 'completed'
            lesson.save(update_fields=['status'])
            count += 1
    return count


def payable(lesson) -> bool:
    if lesson.payment != 'captured' or lesson.end + PAYOUT_AFTER > timezone.now():
        return False
    if lesson.status in ('completed', 'no_show_student'):
        return True
    if lesson.status == 'cancelled' and lesson.cancelled_by == 'student':
        return True  # поздняя отмена учеником
    dispute = getattr(lesson, 'dispute', None)
    return lesson.status == 'disputed' and dispute is not None and dispute.status == 'resolved_paid'


def pay_out(now) -> int:
    count = 0
    for lesson in Lesson.objects.filter(payment='captured').select_related('tutor', 'student'):
        if not payable(lesson):
            continue
        with transaction.atomic():
            if money.payout(lesson):
                lesson.save()
                notify(lesson.tutor.user, 'payment', 'Выплата отправлена', f'За урок {lesson.subject}: {lesson.tutor_price} ₽', '/tutor/finance')
                count += 1
    return count


def expire_requests(now) -> int:
    from requests_board.models import StudyRequest

    return StudyRequest.objects.filter(status='open', expires_at__lt=now).update(status='expired')


def run_all() -> dict:
    now = timezone.now()
    return {'expired_lessons': expire_unconfirmed(now), 'auto_completed': auto_complete(now), 'payouts': pay_out(now), 'expired_requests': expire_requests(now)}
