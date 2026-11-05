from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.db import connection, connections
from django.db.models import Avg, Count
from django.utils import timezone

from accounts.models import User
from lessons.models import Lesson
from reviews import services
from reviews.models import Review
from tutors.models import Tutor


@pytest.mark.django_db(transaction=True)
def test_parallel_review_moderation_keeps_aggregate_consistent():
    if connection.vendor != 'postgresql':
        pytest.skip('PostgreSQL row lock test')
    call_command('seed_demo', verbosity=0)
    template = Lesson.objects.get(pk='l-1')
    ids = []
    for rating in [1, 5]:
        lesson = Lesson.objects.create(tutor=template.tutor, student=template.student, subject=template.subject,
            kind='regular', start=timezone.now() - timedelta(days=5), duration_min=60, status='completed')
        ids.append(Review.objects.create(lesson=lesson, tutor=template.tutor, rating=rating, text='Review', author_name='Student').pk)
    barrier = Barrier(2)
    recalc = services.recalc_rating
    def simultaneous(tutor):
        barrier.wait(timeout=10)
        recalc(tutor)
    def moderate(review_id):
        try:
            services.moderate(review_id, True, actor=User.objects.get(email='admin@toprepet.ru'))
        finally:
            connections.close_all()
    with patch.object(services, 'recalc_rating', simultaneous), ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(moderate, ids))
    tutor = Tutor.objects.get(pk=template.tutor_id)
    stats = tutor.reviews.filter(status='published').aggregate(avg=Avg('rating'), n=Count('id'))
    assert tutor.reviews_count == stats['n']
    assert float(tutor.rating) == round(stats['avg'], 1)
