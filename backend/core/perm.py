from .errors import ApiError, forbidden


def require_user(request):
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        raise ApiError('Войдите, чтобы продолжить', 401, 'unauthorized')
    return user


def require_role(request, *roles):
    user = require_user(request)
    if user.role not in roles:
        raise forbidden({'tutor': 'Раздел для репетиторов', 'student': 'Раздел для учеников', 'admin': 'Раздел для администратора'}.get(roles[0], 'Нет доступа'))
    return user


def my_tutor(request):
    user = require_role(request, 'tutor')
    tutor = getattr(user, 'tutor', None)
    if tutor is None:
        raise ApiError('Анкета не найдена', 404, 'not_found')
    return tutor
