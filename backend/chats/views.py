from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from core.errors import ApiError, not_found
from core.perm import require_role, require_user
from core.utils import iso
from notifications.service import notify, notify_admins
from services.contacts import CONTACTS_MESSAGE, has_contacts
from services.images import save_photo
from tutors.models import Tutor

from .models import Conversation, Message
from .service import get_or_create_conversation


def conversation_json(c, user) -> dict:
    tutor_side = user.role == 'tutor'
    data = {
        'id': c.id, 'peerName': c.student.name if tutor_side else c.tutor.name, 'peerPhoto': None if tutor_side else (c.tutor.photo or None),
        'peerRole': 'student' if tutor_side else 'tutor', 'lastMessage': c.last_message, 'updatedAt': iso(c.updated_at),
        'unread': c.unread_tutor if tutor_side else c.unread_student, 'tutorId': c.tutor_id, 'studentId': c.student_id,
    }
    if c.blocked:
        data['blocked'] = True
    return data


def message_json(m, peer_read_at=None, viewer_id=None) -> dict:
    """`read`: для своих сообщений — собеседник открыл диалог после отправки; чужие считаются прочитанными."""
    own = viewer_id is not None and m.author_id == viewer_id
    read = bool(peer_read_at and m.at <= peer_read_at) if own else True
    data = {'id': m.id, 'conversationId': m.conversation_id, 'authorId': m.author_id, 'kind': m.kind, 'text': m.text, 'at': iso(m.at), 'read': read}
    if m.image:
        data['imageUrl'] = m.image
    return data


def mine(user, conversation_id: str) -> Conversation:
    query = Conversation.objects.select_related('tutor', 'student')
    if user.role == 'student':
        query = query.filter(student=user)
    elif user.role == 'tutor':
        query = query.filter(tutor__user=user)
    else:
        query = query.none()
    c = query.filter(id=conversation_id).first()
    if c is None:
        raise not_found('Диалог не найден')
    return c


class ConversationsView(APIView):
    def get(self, request):
        user = require_user(request)
        query = Conversation.objects.select_related('tutor', 'student')
        query = query.filter(student=user) if user.role == 'student' else query.filter(tutor__user=user) if user.role == 'tutor' else query.none()
        return Response([conversation_json(c, user) for c in query])

    def post(self, request):
        user = require_role(request, 'student')
        tutor = Tutor.objects.filter(id=str(request.data.get('tutorId', '')), status='published').first()
        if tutor is None:
            raise not_found('Анкета не найдена')
        return Response(conversation_json(get_or_create_conversation(tutor, user), user))


class ConversationView(APIView):
    def get(self, request, conversation_id):
        user = require_user(request)
        return Response(conversation_json(mine(user, conversation_id), user))


class MessagesView(APIView):
    def get(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id)
        now = timezone.now()
        side = {'unread_tutor': 0, 'tutor_read_at': now} if user.role == 'tutor' else {'unread_student': 0, 'student_read_at': now}
        peer_read_at = c.student_read_at if user.role == 'tutor' else c.tutor_read_at
        Conversation.objects.filter(id=c.id).update(**side)
        return Response([message_json(m, peer_read_at, user.id) for m in c.messages.all()])

    @transaction.atomic
    def post(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id)
        if c.blocked:
            raise ApiError('Диалог заблокирован: писать в него нельзя', 403, 'blocked')
        text = str(request.data.get('text', '')).strip()
        has_file = bool(request.FILES.get('file'))
        if not text and not has_file:
            raise ApiError('Напишите сообщение')
        if len(text) > 2000:
            raise ApiError('Сообщение слишком длинное')
        if text and has_contacts(text):
            raise ApiError(CONTACTS_MESSAGE)
        image = save_photo(request) if has_file else ''
        m = Message.objects.create(conversation=c, author=user, kind='photo' if image else 'text', text=text, image=image)
        text = text or 'Фото'
        mine_side = user.role == 'tutor'
        Conversation.objects.filter(id=c.id).update(last_message=text[:300], updated_at=timezone.now(), **({'unread_student': F('unread_student') + 1} if mine_side else {'unread_tutor': F('unread_tutor') + 1}))
        c.refresh_from_db()
        recipient, unread = (c.student, c.unread_student) if mine_side else (c.tutor.user, c.unread_tutor)
        if unread == 1:  # одно уведомление на серию сообщений
            notify(recipient, 'message', 'Новое сообщение', f'{user.name}: {text[:120]}', f'/me/chats/{c.id}' if mine_side else f'/tutor/chats/{c.id}')
        return Response(message_json(m, None, user.id), status=201)


class MessageView(APIView):
    @transaction.atomic
    def delete(self, request, conversation_id, message_id):
        user = require_user(request)
        c = mine(user, conversation_id)
        m = c.messages.filter(id=message_id, author=user).exclude(kind='event').first()
        if not m:
            raise ApiError('Можно удалить только своё сообщение', 404, 'not_found')
        m.delete()
        last = c.messages.exclude(kind='event').order_by('-at', '-id').first()
        Conversation.objects.filter(id=c.id).update(last_message=((last.text or 'Фото') if last else '')[:300])
        return Response(status=204)


class ReportView(APIView):
    def post(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id)
        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            raise ApiError('Выберите причину жалобы')
        c.reports = [*c.reports, {'by': user.id, 'reason': reason[:300], 'at': iso(timezone.now())}]
        if request.data.get('block'):
            c.blocked = True
        c.save(update_fields=['reports', 'blocked'])
        notify_admins('message', 'Жалоба на диалог', f'{c.student.name} и {c.tutor.name}: {reason[:120]}', None)
        return Response(status=204)
