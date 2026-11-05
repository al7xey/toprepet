from core.inputs import boolean_input
from django.db import transaction
from django.db.models import F, Q
from rest_framework import serializers
from django.utils import timezone
from rest_framework.response import Response
from core.views import APIView

from core.errors import ApiError, not_found
from core.perm import require_role, require_user
from core.utils import iso
from notifications.service import notify, notify_admins
from services.contacts import CONTACTS_MESSAGE, has_contacts
from services.images import normalize_photo
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


def message_json(m, peer_read_at=None, viewer_id=None, request=None) -> dict:
    """`read`: для своих сообщений — собеседник открыл диалог после отправки; чужие считаются прочитанными."""
    own = viewer_id is not None and m.author_id == viewer_id
    read = bool(peer_read_at and m.at <= peer_read_at) if own else True
    data = {'id': m.id, 'conversationId': m.conversation_id, 'authorId': m.author_id, 'kind': m.kind, 'text': m.text, 'at': iso(m.at), 'read': read}
    if m.attachment and request:
        data['imageUrl'] = request.build_absolute_uri(f'/conversations/{m.conversation_id}/messages/{m.pk}/image')
    elif m.image:
        # Legacy public files must be migrated; do not advertise public URLs.
        data['imageUrl'] = request.build_absolute_uri(f'/conversations/{m.conversation_id}/messages/{m.pk}/image') if request else None
    if m.card:
        data['card'] = m.card
    return data


def mine(user, conversation_id: str, *, lock=False) -> Conversation:
    query = Conversation.objects.select_related('tutor', 'student')
    if user.role == 'student':
        query = query.filter(student=user)
    elif user.role == 'tutor':
        query = query.filter(tutor__user=user)
    else:
        query = query.none()
    if lock:
        query = query.select_for_update(of=('self',))
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


class MessagePageIn(serializers.Serializer):
    before = serializers.CharField(max_length=40, required=False)
    limit = serializers.IntegerField(min_value=1, max_value=100, default=100)


class MessagesView(APIView):
    throttle_scope = 'message'

    def get(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id)
        parsed = MessagePageIn(data=request.query_params)
        parsed.is_valid(raise_exception=True)
        data = parsed.validated_data
        query = c.messages.all()
        if data.get('before'):
            anchor = query.filter(pk=data['before']).first()
            if anchor is None:
                raise not_found('Сообщение не найдено')
            query = query.filter(Q(at__lt=anchor.at) | Q(at=anchor.at, id__lt=anchor.id))
        page = list(query.order_by('-at', '-id')[:data['limit']])
        page.reverse()
        peer_read_at = c.student_read_at if user.role == 'tutor' else c.tutor_read_at
        return Response([message_json(m, peer_read_at, user.id, request) for m in page])

    @transaction.atomic
    def post(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id, lock=True)
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
        from django.core.files.base import ContentFile
        import uuid
        m = Message(conversation=c, author=user, kind='photo' if has_file else 'text', text=text)
        if has_file:
            data, ext = normalize_photo(request.FILES['file'])
            m.attachment.save(uuid.uuid4().hex + '.' + ext, ContentFile(data), save=False)
        m.save()
        text = text or 'Фото'
        mine_side = user.role == 'tutor'
        Conversation.objects.filter(id=c.id).update(last_message=text[:300], updated_at=timezone.now(), **({'unread_student': F('unread_student') + 1} if mine_side else {'unread_tutor': F('unread_tutor') + 1}))
        c.refresh_from_db()
        recipient, unread = (c.student, c.unread_student) if mine_side else (c.tutor.user, c.unread_tutor)
        if unread == 1:  # одно уведомление на серию сообщений
            notify(recipient, 'message', 'Новое сообщение', f'{user.name}: {text[:120]}', f'/me/chats/{c.id}' if mine_side else f'/tutor/chats/{c.id}')
        return Response(message_json(m, None, user.id, request), status=201)


class MessageView(APIView):
    @transaction.atomic
    def delete(self, request, conversation_id, message_id):
        user = require_user(request)
        c = mine(user, conversation_id, lock=True)
        m = c.messages.filter(id=message_id, author=user).exclude(kind='event').first()
        if not m:
            raise ApiError('Можно удалить только своё сообщение', 404, 'not_found')
        m.delete()
        last = c.messages.exclude(kind='event').order_by('-at', '-id').first()
        Conversation.objects.filter(id=c.id).update(last_message=((last.text or 'Фото') if last else '')[:300])
        return Response(status=204)


class ReportView(APIView):
    throttle_scope = 'report'

    @transaction.atomic
    def post(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id, lock=True)
        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            raise ApiError('Выберите причину жалобы')
        c.reports = [*c.reports[-19:], {'by': user.id, 'reason': reason[:300], 'at': iso(timezone.now())}]
        if boolean_input(request.data, 'block', default=False):
            c.blocked = True
        c.save(update_fields=['reports', 'blocked'])
        notify_admins('message', 'Жалоба на диалог', f'{c.student.name} и {c.tutor.name}: {reason[:120]}', None)
        return Response(status=204)


class ReadView(APIView):
    @transaction.atomic
    def post(self, request, conversation_id):
        user = require_user(request)
        c = mine(user, conversation_id, lock=True)
        through = request.data.get('throughMessageId')
        if through is not None and (not isinstance(through, str) or len(through) > 40):
            raise ApiError('Неверный идентификатор сообщения')
        anchor = c.messages.filter(pk=through).first() if through else c.messages.order_by('-at', '-id').first()
        if through and anchor is None:
            raise not_found('Сообщение не найдено')
        side_name = 'tutor' if user.role == 'tutor' else 'student'
        previous = getattr(c, side_name + '_read_at')
        cutoff = max(anchor.at, previous) if anchor and previous else anchor.at if anchor else timezone.now()
        unread = c.messages.filter(at__gt=cutoff, author__isnull=False).exclude(author=user).count()
        Conversation.objects.filter(pk=c.pk).update(**{'unread_' + side_name: unread, side_name + '_read_at': cutoff})
        return Response(status=204)


class ImageView(APIView):
    def get(self, request, conversation_id, message_id):
        from django.http import FileResponse
        user = require_user(request)
        c = mine(user, conversation_id)
        m = c.messages.filter(pk=message_id).first()
        if m is None or not m.attachment:
            raise not_found('Фото не найдено')
        try:
            stream = m.attachment.open('rb')
        except FileNotFoundError:
            raise not_found('Фото не найдено')
        ext = m.attachment.name.rsplit('.', 1)[-1].lower()
        mime = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}.get(ext)
        if not mime:
            stream.close()
            raise not_found('Фото не найдено')
        return FileResponse(stream, content_type=mime)
