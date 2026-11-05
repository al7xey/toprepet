import hashlib
import re
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from chats.models import Message


def digest(storage, name):
    value = hashlib.sha256()
    with storage.open(name, 'rb') as stream:
        for chunk in stream.chunks():
            value.update(chunk)
    return value.digest()


class Command(BaseCommand):
    help = 'Copy and verify legacy chat photos into private storage; never fetch external URLs.'

    def handle(self, *args, **options):
        count = 0
        prefix = urlparse(settings.MEDIA_URL).path.rstrip('/') + '/photos/'
        for pk in Message.objects.exclude(image='').values_list('pk', flat=True).iterator():
            with transaction.atomic():
                message = Message.objects.select_for_update().get(pk=pk)
                path = urlparse(message.image).path
                if not path.startswith(prefix) or not re.fullmatch(r'[0-9a-f]{32}\.(?:jpg|jpeg|png|webp)', path[len(prefix):]):
                    raise CommandError('Non-local legacy attachment requires manual review')
                source = 'photos/' + path[len(prefix):]
                if not default_storage.exists(source):
                    raise CommandError('Legacy source missing; original database value preserved')
                target = 'messages/' + path[len(prefix):]
                private = message.attachment.storage
                if not private.exists(target):
                    with default_storage.open(source, 'rb') as stream:
                        actual = private.save(target, stream)
                    if actual != target:
                        raise CommandError('Private target collision; source preserved')
                if digest(private, target) != digest(default_storage, source):
                    raise CommandError('Attachment verification failed; source preserved')
                message.attachment.name = target
                message.image = ''
                message.save(update_fields=['attachment', 'image'])
                transaction.on_commit(lambda name=source: default_storage.delete(name))
                count += 1
        self.stdout.write(f'Verified and secured chat attachments: {count}')
