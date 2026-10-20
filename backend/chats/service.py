from django.utils import timezone

from .models import Conversation, Message


def get_or_create_conversation(tutor, student) -> Conversation:
    conversation, _ = Conversation.objects.get_or_create(tutor=tutor, student=student)
    return conversation


def system_message(tutor, student, text: str):
    """Строка-событие в диалоге («Ольга записалась на урок»)."""
    conversation = get_or_create_conversation(tutor, student)
    message = Message.objects.create(conversation=conversation, author=None, kind='event', text=text)
    conversation.last_message = text
    conversation.updated_at = timezone.now()
    conversation.save(update_fields=['last_message', 'updated_at'])
    return message


def direct_message(tutor, student, author, text: str):
    """Обычное сообщение от участника диалога: отклик на заявку и запись по отклику."""
    from django.db.models import F
    conversation = get_or_create_conversation(tutor, student)
    message = Message.objects.create(conversation=conversation, author=author, kind='text', text=text)
    unread = {'unread_student': F('unread_student') + 1} if author.id != student.id else {'unread_tutor': F('unread_tutor') + 1}
    Conversation.objects.filter(id=conversation.id).update(last_message=text[:300], updated_at=timezone.now(), **unread)
    return message
