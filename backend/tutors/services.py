from .models import Tutor

EMPTY_WEEK = [{'weekday': d, 'intervals': []} for d in range(1, 8)]


def create_draft_profile(user) -> Tutor:
    """Регистрация репетитора создаёт пустой черновик анкеты с закрытым расписанием."""
    return Tutor.objects.create(user=user, name=user.name, timezone=user.timezone, week=[dict(day) for day in EMPTY_WEEK], status='draft')
