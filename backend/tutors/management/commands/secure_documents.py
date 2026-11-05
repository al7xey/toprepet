"""Move legacy public document files into private storage without deleting unverified copies."""
import hashlib

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from tutors.models import TutorDocument


def digest(storage, name):
    result = hashlib.sha256()
    with storage.open(name, 'rb') as stream:
        for chunk in stream.chunks():
            result.update(chunk)
    return result.digest()


class Command(BaseCommand):
    help = 'Verify, copy and remove legacy documents from public MEDIA_ROOT. Run after migration.'

    def handle(self, *args, **options):
        count = 0
        for pk in TutorDocument.objects.exclude(file='').values_list('pk', flat=True).iterator():
            with transaction.atomic():
                doc = TutorDocument.objects.select_for_update().get(pk=pk)
                name = doc.file.name
                if not name.startswith('documents/') or '..' in name.split('/'):
                    raise CommandError('Unsafe legacy document path; manual review required')
                if not default_storage.exists(name):
                    continue
                private = doc.file.storage
                source_hash = digest(default_storage, name)
                if not private.exists(name):
                    with default_storage.open(name, 'rb') as source:
                        saved = private.save(name, source)
                    if saved != name:
                        raise CommandError('Private destination collision; original preserved')
                if digest(private, name) != source_hash:
                    raise CommandError('Document verification failed; original preserved')
                transaction.on_commit(lambda filename=name: default_storage.delete(filename))
                count += 1
        self.stdout.write(f'Verified and secured documents: {count}')
