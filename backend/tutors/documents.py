"""Document upload and moderation boundary. Never expose user supplied paths or public URLs."""
import os
import uuid

from django.core.files.base import ContentFile
from django.db import transaction

from core.audit import record
from core.errors import ApiError, not_found
from core.perm import my_tutor
from .models import Tutor, TutorDocument, DocumentFileDeletion


@transaction.atomic
def upload_document(request):
    tutor = my_tutor(request)
    Tutor.objects.select_for_update(no_key=True).get(pk=tutor.pk)
    title = request.data.get('title', '')
    file = request.FILES.get('file')
    if not isinstance(title, str) or not title.strip() or len(title) > 200:
        raise ApiError('Укажите название документа до 200 символов')
    if not file:
        raise ApiError('Прикрепите документ')
    if file.size > 10_000_000:
        raise ApiError('Файл больше 10 МБ', 413, 'upload_too_large')
    if tutor.documents.count() >= 20:
        raise ApiError('Можно загрузить до 20 документов', 409, 'document_limit')
    ext = os.path.splitext(file.name)[1].lower()
    if ext == '.pdf':
        # Quarantine, not malware certification: PDFs are always downloaded as attachments.
        head = file.read(8)
        file.seek(max(0, file.size - 1024))
        tail = file.read()
        file.seek(0)
        if not head.startswith(b'%PDF-') or b'%%EOF' not in tail:
            raise ApiError('Файл не похож на корректный PDF')
    elif ext in ('.jpg', '.jpeg', '.png', '.webp'):
        from services.images import normalize_photo
        data, ext = normalize_photo(file)
        file = ContentFile(data, name='document.' + ext)
        ext = '.' + ext
    else:
        raise ApiError('Подойдут PDF и изображения')
    doc = TutorDocument(tutor=tutor, title=title.strip(), status='checking')
    doc.file.save(uuid.uuid4().hex + ext, file, save=False)
    doc.save()
    record(request.user, 'document.upload', doc.pk)
    return doc


@transaction.atomic
def moderate_document(admin, document_id, approve):
    if not admin.is_authenticated or not admin.is_active or admin.role != 'admin':
        from core.errors import forbidden
        raise forbidden()
    doc = TutorDocument.objects.select_for_update().filter(pk=document_id).first()
    if doc is None:
        raise not_found('Документ не найден')
    if doc.status != 'checking':
        raise ApiError('Документ уже проверен', 409, 'document_processed')
    if not doc.file or not doc.file.storage.exists(doc.file.name):
        raise ApiError('Файл документа недоступен')
    doc.status = 'approved' if approve else 'rejected'
    doc.save(update_fields=['status'])
    record(admin, 'document.moderate', doc.pk, doc.status)
    return doc


@transaction.atomic
def delete_document(request, document_id):
    tutor = my_tutor(request)
    Tutor.objects.select_for_update(no_key=True).get(pk=tutor.pk)
    doc = TutorDocument.objects.select_for_update().filter(pk=document_id, tutor=tutor).first()
    if doc is None:
        raise not_found('Документ не найден')
    filename = doc.file.name
    record(request.user, 'document.delete', doc.pk, doc.status)
    doc.delete()
    if filename:
        # Each deletion owns its task, including concurrent legacy shared paths.
        task = DocumentFileDeletion.objects.create(name=filename)
        transaction.on_commit(lambda: cleanup_document_deletion(task.pk), robust=True)


@transaction.atomic
def cleanup_document_deletion(task_id):
    task = DocumentFileDeletion.objects.select_for_update(skip_locked=True).filter(pk=task_id).first()
    if task is None:
        return 0
    # Legacy imports can share paths. Another document must retain its file.
    if TutorDocument.objects.filter(file=task.name).exists():
        task.delete()
        return 0
    try:
        TutorDocument._meta.get_field('file').storage.delete(task.name)
    except OSError as error:
        import logging
        logging.getLogger('security').error('Private file cleanup failed task_id=%s error=%s', task.pk, type(error).__name__)
        return 0  # Keep the task for the next worker run.
    task.delete()
    return 1


def cleanup_document_files():
    task_ids = list(DocumentFileDeletion.objects.order_by('created_at', 'pk').values_list('pk', flat=True)[:100])
    return sum(cleanup_document_deletion(pk) for pk in task_ids)
