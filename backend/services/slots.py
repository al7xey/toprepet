"""Scheduling uses full lesson intervals and the tutor's local timezone."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from django.utils import timezone as djtz

BOOKING_LEAD = timedelta(hours=2)


def week_rule(tutor, weekday: int) -> list[dict]:
    return next((day.get('intervals', []) for day in tutor.week or [] if day.get('weekday') == weekday), [])


def minute_of_day(text: str) -> int:
    hour, minute = map(int, text.split(':'))
    return hour * 60 + minute


def slots_for(tutor, from_dt: datetime, days: int, busy=None, *, duration_min: int = 60) -> list[dict]:
    """Starts every hour from the beginning of a working interval; validate the entire duration."""
    from tutors.models import ScheduleException

    if not 1 <= duration_min <= 240:
        raise ValueError('Invalid lesson duration')
    tz = ZoneInfo(tutor.timezone)
    first = from_dt.astimezone(tz).date()
    exceptions = {e.date: e for e in ScheduleException.objects.filter(tutor=tutor, date__gte=first, date__lt=first + timedelta(days=days))}
    if busy is None:
        busy = busy_ranges(tutor, first, days, tz)
    lead = djtz.now() + BOOKING_LEAD
    unique = {}
    for offset in range(days):
        day = first + timedelta(days=offset)
        exception = exceptions.get(day)
        if exception and exception.kind == 'off':
            continue
        intervals = list(week_rule(tutor, day.isoweekday()))
        if exception and exception.kind == 'extra':
            intervals += exception.intervals
        # Merge adjacent/overlapping intervals so a long lesson can cross their boundary.
        merged = []
        for lo, hi in sorted((minute_of_day(i['from']), minute_of_day(i['to'])) for i in intervals):
            if merged and lo <= merged[-1][1]:
                merged[-1][1] = max(hi, merged[-1][1])
            else:
                merged.append([lo, hi])
        midnight = datetime(day.year, day.month, day.day)
        for lo, hi in merged:
            local_end = (midnight + timedelta(minutes=hi)).replace(tzinfo=tz)
            for minute in range(lo, hi - duration_min + 1, 60):
                local = (midnight + timedelta(minutes=minute)).replace(tzinfo=tz)
                start = local.astimezone(timezone.utc)
                # Reject nonexistent local times at a spring DST transition.
                if start.astimezone(tz).replace(tzinfo=None) != local.replace(tzinfo=None):
                    continue
                end = start + timedelta(minutes=duration_min)
                available = start > lead and end <= local_end.astimezone(timezone.utc) and not any(a < end and start < b for a, b in busy)
                unique[start] = {'start': start, 'available': available}
    return [unique[start] for start in sorted(unique)]


def busy_ranges(tutor, first, days, tz):
    from lessons.models import Lesson

    lo = datetime(first.year, first.month, first.day, tzinfo=tz).astimezone(timezone.utc) - timedelta(days=1)
    hi = lo + timedelta(days=days + 2)
    return [(l.start, l.end) for l in Lesson.objects.filter(tutor=tutor, status__in=Lesson.ACTIVE, start__gte=lo, start__lt=hi).only('start', 'duration_min')]
