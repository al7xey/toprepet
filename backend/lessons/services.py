from datetime import timedelta, timezone as dt_timezone

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from chats.service import direct_message, get_or_create_conversation, system_message
from core.errors import ApiError, forbidden, not_found
from notifications.service import notify, notify_admins
from payments import service as money
from services.slots import slots_for

from .models import Dispute, Lesson

HOUR = timedelta(hours=1)
DAY = timedelta(days=1)
FREE_CANCEL = 4 * HOUR


def round_half_up(value: float) -> int:
    return int(value + 0.5)


def visible_lessons(user):
    if user.role == 'student':
        return Lesson.objects.filter(student=user)
    if user.role == 'tutor':
        return Lesson.objects.filter(tutor__user=user)
    return Lesson.objects.all() if user.role == 'admin' else Lesson.objects.none()


def get_lesson(user, lesson_id: str, *, lock: bool = False) -> Lesson:
    query = visible_lessons(user).select_related('tutor', 'student')
    if lock:
        query = query.select_for_update(of=('self',))
    lesson = query.filter(id=lesson_id).first()
    if lesson is None:
        raise not_found('Урок не найден')
    return lesson


def _is_tutor_of(user, lesson) -> bool:
    return user.role == 'tutor' and lesson.tutor.user_id == user.id


def _is_student_of(user, lesson) -> bool:
    return user.role == 'student' and lesson.student_id == user.id


def _other_party(user, lesson):
    return lesson.tutor.user if user.role == 'student' else lesson.student


@transaction.atomic
def create_booking(user, data: dict, idempotency_key: str = '') -> Lesson:
    from requests_board.models import RequestResponse, StudyRequest
    from tutors.models import Tutor

    if user.role != 'student':
        raise ApiError('Записываться могут только ученики', 403, 'forbidden')
    if idempotency_key:
        existing = Lesson.objects.filter(student=user, idempotency_key=idempotency_key).select_related('tutor', 'student').first()
        if existing:
            return existing
    tutor = Tutor.objects.select_for_update().filter(id=data['tutorId'], status='published').first()
    if tutor is None:
        raise not_found('Анкета не найдена')
    start = data['start'].astimezone(dt_timezone.utc).replace(second=0, microsecond=0)
    slot = next((s for s in slots_for(tutor, start, 1) if s['start'] == start), None)
    if slot is None or not slot['available']:
        raise ApiError('Это время уже занято. Выберите другое.', 409, 'slot_taken')
    intro = data['kind'] == 'intro'
    if intro:
        if not tutor.intro_minutes:
            raise ApiError('У этого репетитора нет бесплатного знакомства')
        if Lesson.objects.filter(kind='intro', tutor=tutor, student=user).exclude(status__in=['declined', 'expired', 'cancelled']).exists():
            raise ApiError('Бесплатное знакомство с этим репетитором уже было', 409, 'intro_used')
        duration = tutor.intro_minutes
    else:
        duration = data['durationMin']
        if duration not in (tutor.durations or [60]):
            raise ApiError('Такой длительности урока у репетитора нет')
    price = 0 if intro else round_half_up(tutor.student_price * duration / 60)
    tutor_price = 0 if intro else round_half_up(tutor.price * duration / 60)
    card = None
    if price:
        cards = user.cards.all()
        card = cards.filter(id=data['cardId']).first() if data.get('cardId') else (cards.filter(primary=True).first() or cards.first())
        if card is None:
            raise ApiError('Добавьте карту, чтобы записаться', 402, 'card_required')
    now = timezone.now()
    lesson = Lesson(kind=data['kind'], tutor=tutor, student=user, subject=data['subject'], start=start, duration_min=duration, status='pending',
                    price=price, tutor_price=tutor_price, confirm_by=min(start - 2 * HOUR, now + DAY), idempotency_key=idempotency_key)
    lesson.save()
    money.hold(lesson, card)
    lesson.save()
    if data.get('requestId'):
        request = StudyRequest.objects.filter(id=data['requestId'], student=user, status='open').first()
        if request:
            request.status = 'booked'
            request.save(update_fields=['status'])
            for response in RequestResponse.objects.filter(request=request):
                response.status = 'accepted' if response.tutor_id == tutor.id else 'closed'
                response.save(update_fields=['status'])
            lesson.request = request
            lesson.save(update_fields=['request'])
            direct_message(tutor, user, user, f'Выбрала ваш отклик на заявку «{request.subject}» и записалась на урок.')
    get_or_create_conversation(tutor, user)
    system_message(tutor, user, f'{user.name} записалась на {"бесплатное знакомство" if intro else "урок"}')
    notify(tutor.user, 'lesson', 'Новая запись', f'{user.name} записалась. Подтвердите запись.', f'/tutor/lessons/{lesson.id}')
    return lesson


@transaction.atomic
def cancel(user, lesson_id: str, reason: str) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if user.role == 'admin':
        raise forbidden()
    if lesson.status not in Lesson.ACTIVE:
        raise ApiError('Этот урок уже нельзя отменить')
    late = lesson.start - timezone.now() < FREE_CANCEL
    lesson.status, lesson.cancel_reason, lesson.cancelled_by = 'cancelled', reason, user.role
    lesson.move_start, lesson.move_by = None, ''
    free = user.role == 'tutor' or not late or lesson.payment == 'hold'
    if lesson.price == 0:
        lesson.payment = 'none'
    elif free:
        money.refund(lesson)
    # поздняя отмена учеником: деньги остаются списанными, репетитор получит выплату
    lesson.save()
    system_message(lesson.tutor, lesson.student, f'{user.name} отменила урок' if user.role == 'student' else f'{user.name} отменил(а) урок')
    notify(_other_party(user, lesson), 'lesson', 'Урок отменён', reason, f'/tutor/lessons/{lesson.id}' if user.role == 'student' else f'/me/lessons/{lesson.id}')
    return lesson


def _slot_free_for(lesson, start) -> bool:
    slots = slots_for(lesson.tutor, start, 1)
    for slot in slots:
        if slot['start'] == start:
            if slot['available']:
                return True
            # слот занят самим этим уроком — переносить «на то же время» нет смысла
            return False
    return False


@transaction.atomic
def propose_move(user, lesson_id: str, start) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if user.role == 'admin':
        raise forbidden()
    if lesson.status not in Lesson.ACTIVE:
        raise ApiError('Перенести можно только предстоящий урок')
    start = start.astimezone(dt_timezone.utc).replace(second=0, microsecond=0)
    if not _slot_free_for(lesson, start):
        raise ApiError('Это время недоступно. Выберите другое.', 409, 'slot_taken')
    lesson.move_start, lesson.move_by = start, user.role
    lesson.save(update_fields=['move_start', 'move_by'])
    notify(_other_party(user, lesson), 'lesson', 'Предложен перенос урока', 'Подтвердите или отклоните новое время.', f'/tutor/lessons/{lesson.id}' if user.role == 'student' else f'/me/lessons/{lesson.id}')
    return lesson


@transaction.atomic
def answer_move(user, lesson_id: str, accept: bool) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if not lesson.move_start:
        raise ApiError('Нет предложения о переносе')
    if lesson.move_by == user.role or user.role == 'admin':
        raise forbidden('Ответить на перенос может другая сторона')
    if accept:
        if not _slot_free_for(lesson, lesson.move_start):
            lesson.move_start, lesson.move_by = None, ''
            lesson.save(update_fields=['move_start', 'move_by'])
            raise ApiError('Это время уже занято. Предложите другое.', 409, 'slot_taken')
        lesson.start = lesson.move_start
        if lesson.status == 'pending':
            lesson.confirm_by = min(lesson.start - 2 * HOUR, timezone.now() + DAY)
    lesson.move_start, lesson.move_by = None, ''
    lesson.save()
    notify(_other_party(user, lesson), 'lesson', 'Перенос принят' if accept else 'Перенос отклонён', '', f'/tutor/lessons/{lesson.id}' if user.role == 'student' else f'/me/lessons/{lesson.id}')
    return lesson


@transaction.atomic
def confirm(user, lesson_id: str) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if not _is_tutor_of(user, lesson):
        raise forbidden('Подтверждает запись репетитор')
    if lesson.status != 'pending':
        raise ApiError('Запись уже обработана')
    money.capture(lesson)
    lesson.status = 'confirmed'
    lesson.meeting_url = settings.MEETING_URL
    lesson.save()
    system_message(lesson.tutor, lesson.student, f'{lesson.tutor.name} подтвердила {"знакомство" if lesson.kind == "intro" else "урок"}')
    notify(lesson.student, 'lesson', 'Запись подтверждена', f'{lesson.tutor.name} подтвердила запись', f'/me/lessons/{lesson.id}')
    return lesson


@transaction.atomic
def decline(user, lesson_id: str, reason: str) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if not _is_tutor_of(user, lesson):
        raise forbidden('Отклонить запись может репетитор')
    if lesson.status != 'pending':
        raise ApiError('Запись уже обработана')
    lesson.status, lesson.decline_reason = 'declined', reason
    money.release(lesson)
    lesson.save()
    notify(lesson.student, 'lesson', 'Запись отклонена', reason, f'/me/lessons/{lesson.id}')
    return lesson


@transaction.atomic
def mark_result(user, lesson_id: str, result: str) -> Lesson:
    lesson = get_lesson(user, lesson_id, lock=True)
    if lesson.status != 'confirmed':
        raise ApiError('Итог можно отметить только у подтверждённого урока')
    if timezone.now() < lesson.start:
        raise ApiError('Урок ещё не начался')
    if result in ('happened', 'no_show_student') and not _is_tutor_of(user, lesson):
        raise forbidden('Это отмечает репетитор')
    if result == 'no_show_tutor' and not _is_student_of(user, lesson):
        raise forbidden('Это отмечает ученик')
    if result == 'happened' and timezone.now() < lesson.end:
        raise ApiError('Урок ещё идёт')
    lesson.status = 'completed' if result == 'happened' else result
    if result == 'no_show_tutor':
        money.refund(lesson)
    lesson.save()
    return lesson


@transaction.atomic
def report_problem(user, lesson_id: str, reason: str, text: str) -> Dispute:
    lesson = get_lesson(user, lesson_id, lock=True)
    if not _is_student_of(user, lesson):
        raise forbidden('Сообщить о проблеме может ученик')
    if Dispute.objects.filter(lesson=lesson).exists():
        raise ApiError('По этому уроку уже есть обращение', 409, 'dispute_exists')
    if lesson.status not in ('confirmed', 'completed', 'no_show_tutor', 'no_show_student'):
        raise ApiError('По этому уроку нельзя открыть спор')
    now = timezone.now()
    if now < lesson.start:
        raise ApiError('Урок ещё не начался')
    if now - lesson.start > DAY + timedelta(minutes=lesson.duration_min):
        raise ApiError('Сообщить о проблеме можно в течение 24 часов после начала урока')
    dispute = Dispute.objects.create(lesson=lesson, reason=reason, text=text)
    lesson.status = 'disputed'
    lesson.save(update_fields=['status'])
    notify(lesson.tutor.user, 'lesson', 'Ученик сообщил о проблеме', f'Урок {lesson.subject}: {reason}. Ответьте, чтобы поддержка разобралась.', f'/tutor/disputes/{dispute.id}')
    notify_admins('lesson', 'Новый спор', f'{lesson.student.name} и {lesson.tutor.name}: {reason}', '/admin/disputes')
    return dispute


def get_dispute(user, dispute_id: str) -> Dispute:
    dispute = Dispute.objects.select_related('lesson__tutor', 'lesson__student').filter(id=dispute_id).first()
    if dispute is None:
        raise not_found('Спор не найден')
    lesson = dispute.lesson
    if user.role != 'admin' and not (_is_student_of(user, lesson) or _is_tutor_of(user, lesson)):
        raise not_found('Спор не найден')
    return dispute


@transaction.atomic
def reply_dispute(user, dispute_id: str, text: str) -> Dispute:
    dispute = get_dispute(user, dispute_id)
    if not _is_tutor_of(user, dispute.lesson):
        raise forbidden('Отвечает репетитор')
    if dispute.status != 'open':
        raise ApiError('На этот спор уже ответили или он решён')
    dispute.tutor_reply, dispute.status = text, 'tutor_replied'
    dispute.save()
    notify(dispute.lesson.student, 'lesson', 'Репетитор ответил по спору', 'Поддержка рассмотрит ответ и сообщит решение.', f'/me/disputes/{dispute.id}')
    notify_admins('lesson', 'Репетитор ответил по спору', f'{dispute.lesson.student.name} и {dispute.lesson.tutor.name}', '/admin/disputes')
    return dispute


@transaction.atomic
def resolve_dispute(admin, dispute_id: str, outcome: str) -> Dispute:
    dispute = get_dispute(admin, dispute_id)
    if dispute.status.startswith('resolved'):
        raise ApiError('Спор уже решён')
    lesson = Lesson.objects.select_for_update().select_related('tutor', 'student').get(id=dispute.lesson_id)
    if outcome == 'refund':
        dispute.status, dispute.resolution = 'resolved_refund', 'Деньги вернули ученику'
        money.refund(lesson)
    else:
        dispute.status, dispute.resolution = 'resolved_paid', 'Оплата ушла репетитору'
        # деньги остаются списанными; выплату проведёт задание run_jobs, как только у репетитора появятся реквизиты самозанятого
    lesson.save()
    dispute.save()
    notify(lesson.student, 'payment', 'Спор решён', dispute.resolution, f'/me/disputes/{dispute.id}')
    notify(lesson.tutor.user, 'payment', 'Спор решён', dispute.resolution, f'/tutor/disputes/{dispute.id}')
    return dispute
