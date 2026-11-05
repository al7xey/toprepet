from datetime import datetime, timezone


def iso(value: datetime | None) -> str | None:
    """Дата в ISO 8601 UTC с миллисекундами и Z, как у `Date.toISOString()` во фронтенде."""
    if value is None:
        return None
    value = value.astimezone(timezone.utc)
    return value.strftime('%Y-%m-%dT%H:%M:%S.') + f'{value.microsecond // 1000:03d}Z'


def parse_iso(text: str) -> datetime:
    value = datetime.fromisoformat(text.replace('Z', '+00:00'))
    if value.tzinfo is None:
        raise ValueError('Timezone is required')
    return value.astimezone(timezone.utc)
