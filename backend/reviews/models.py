from django.db import models

from core.ids import ShortIdField


class Review(models.Model):
    id = ShortIdField('rv')
    lesson = models.OneToOneField('lessons.Lesson', on_delete=models.CASCADE, related_name='review')
    tutor = models.ForeignKey('tutors.Tutor', on_delete=models.CASCADE, related_name='reviews')
    author_name = models.CharField(max_length=120)
    author_note = models.CharField(max_length=200, blank=True)
    rating = models.PositiveSmallIntegerField()
    text = models.TextField()
    status = models.CharField(max_length=10, default='pending')
    reply = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
