import re

from rest_framework import serializers

from core.utils import iso


_TIME = re.compile(r'^(?:[01]\d|2[0-3]|24):[0-5]\d$')


def tutor_json(t) -> dict:
    return {
        'id': t.id, 'name': t.name, 'photo': t.photo, **({'photoSrcSet': t.photo_srcset} if t.photo_srcset else {}), 'headline': t.headline,
        'subjects': t.subjects, 'cardSubjects': t.card_subjects or ' / '.join(t.subjects), 'helpTopics': t.help_topics or t.subjects,
        'experience': t.experience, 'intro': t.intro, 'approach': t.approach, 'achievements': t.achievements,
        'price': t.price, 'studentPrice': t.student_price, 'introMinutes': t.intro_minutes,
        'rating': float(t.rating) if t.rating is not None else None, 'reviewsCount': t.reviews_count, 'status': t.status, 'timezone': t.timezone,
    }


def profile_json(t) -> dict:
    return {
        'name': t.name, 'headline': t.headline, 'about': t.intro, 'approach': t.approach, 'subjects': t.subjects, 'levels': t.levels,
        'experience': t.experience, 'education': t.achievements, 'price': t.price, 'introMinutes': t.intro_minutes,
        'durations': t.durations or [60], 'photo': t.photo or None, 'status': t.status, 'slug': t.id, 'moderationNote': t.moderation_note or None,
    }


def slot_json(slot: dict) -> dict:
    return {'start': iso(slot['start']), 'available': slot['available']}


def exception_json(e) -> dict:
    return {'date': e.date.isoformat(), 'kind': e.kind, 'intervals': e.intervals}


def document_json(d) -> dict:
    return {'id': d.id, 'title': d.title, 'status': d.status}


class IntervalIn(serializers.Serializer):
    """Интервал «с 18:00 до 21:00»: поле `from` — ключевое слово Python, поэтому разбираем вручную."""

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError('Неверный интервал')
        start, end = str(data.get('from', '')), str(data.get('to', ''))
        if not _TIME.match(start) or not _TIME.match(end):
            raise serializers.ValidationError('Время в формате 18:00')
        if start >= end:
            raise serializers.ValidationError('Начало должно быть раньше конца')
        return {'from': start, 'to': end}


class DayIn(serializers.Serializer):
    weekday = serializers.IntegerField(min_value=1, max_value=7)
    intervals = IntervalIn(many=True)


class WeekIn(serializers.Serializer):
    days = DayIn(many=True)


class ExceptionIn(serializers.Serializer):
    date = serializers.DateField()
    kind = serializers.ChoiceField(choices=['off', 'extra'])
    intervals = IntervalIn(many=True, required=False)


class AchievementIn(serializers.Serializer):
    title = serializers.CharField(max_length=200, allow_blank=True)
    text = serializers.CharField(max_length=1000, allow_blank=True)


class ProfilePatchIn(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    headline = serializers.CharField(max_length=200, allow_blank=True, required=False)
    about = serializers.CharField(max_length=4000, allow_blank=True, required=False)
    approach = serializers.CharField(max_length=4000, allow_blank=True, required=False)
    subjects = serializers.ListField(child=serializers.CharField(max_length=80), max_length=12, required=False)
    levels = serializers.ListField(child=serializers.CharField(max_length=80), max_length=12, required=False)
    experience = serializers.CharField(max_length=200, allow_blank=True, required=False)
    education = AchievementIn(many=True, required=False)
    price = serializers.IntegerField(min_value=0, max_value=100000, required=False)
    introMinutes = serializers.IntegerField(min_value=0, max_value=60, required=False)
    durations = serializers.ListField(child=serializers.IntegerField(min_value=15, max_value=240), max_length=6, required=False)
    photo = serializers.CharField(max_length=500, allow_null=True, allow_blank=True, required=False)
    slug = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
