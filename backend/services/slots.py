from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from django.utils import timezone as djtz

HOUR = timedelta(hours=1)
BOOKING_LEAD = timedelta(hours=2)


def week_rule(tutor, weekday: int) -> list[dict]:
    for day in tutor.week or []:
        if day.get('weekday') == weekday:
            return day.get('intervals', [])
    return []


def _hour(text: str) -> int:
    return int(text.split(':')[0])


def slots_for(tutor, from_dt: datetime, days: int, busy: list[tuple[datetime, datetime]] | None = None) -> list[dict]:
    """Часовые слоты на `days` дней от даты `from_dt` по времени репетитора: недельное расписание плюс исключения."""
    from tutors.models import ScheduleException

    tz = ZoneInfo(tutor.timezone)
    first = from_dt.astimezone(tz).date()
    exceptions = {e.date: e for e in ScheduleException.objects.filter(tutor=tutor, date__gte=first, date__lt=first + timedelta(days=days))}
    if busy is None:
        busy = busy_ranges(tutor, first, days, tz)
    now = djtz.now()
    out = []
    for offset in range(days):
        day = first + timedelta(days=offset)
        exception = exceptions.get(day)
        if exception and exception.kind == 'off':
            continue
        intervals = list(week_rule(tutor, day.isoweekday()))
        if exception and exception.kind == 'extra':
            intervals += exception.intervals
        for interval in intervals:
            for hour in range(_hour(interval['from']), _hour(interval['to'])):
                start = datetime(day.year, day.month, day.day, hour, tzinfo=tz).astimezone(timezone.utc)
                end = start + HOUR
                taken = any(b_start < end and start < b_end for b_start, b_end in busy)
                out.append({'start': start, 'available': start > now + BOOKING_LEAD and not taken})
    out.sort(key=lambda s: s['start'])
    # интервалы могут пересекаться (обычное время и «другое время» в один день): один час показываем один раз
    unique = {}
    for slot in out:
        unique.setdefault(slot['start'], slot)
    return list(unique.values())


def busy_ranges(tutor, first, days, tz) -> list[tuple[datetime, datetime]]:
    from lessons.models import Lesson

    lo = datetime(first.year, first.month, first.day, tzinfo=tz).astimezone(timezone.utc) - timedelta(days=1)
    hi = lo + timedelta(days=days + 2)
    return [(l.start, l.end) for l in Lesson.objects.filter(tutor=tutor, status__in=Lesson.ACTIVE, start__gte=lo, start__lt=hi)]
