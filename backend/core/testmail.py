"""Почтовый бэкенд для контрактных тестов: письма не уходят наружу, а остаются в памяти процесса."""
import re

from django.core.mail.backends.base import BaseEmailBackend

OUTBOX: list[dict] = []


class CaptureBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        for message in email_messages:
            OUTBOX.append({'to': list(message.to), 'subject': message.subject, 'body': message.body})
        return len(email_messages)


def last_token(email: str, kind: str) -> str | None:
    marker = 'auth/verify?token=' if kind == 'verify' else 'reset-password?token='
    for item in reversed(OUTBOX):
        if email in item['to'] and marker in item['body']:
            return re.search(re.escape(marker) + r'([\w-]+)', item['body']).group(1)
    return None
