from rest_framework import status
from rest_framework.exceptions import APIException, AuthenticationFailed, NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler

GENERIC = 'Не удалось выполнить запрос. Попробуйте ещё раз.'


class ApiError(APIException):
    """Ошибка с текстом для пользователя: фронтенд показывает `message` как есть."""

    def __init__(self, message: str, status_code: int = 400, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code


def _first_message(detail) -> str:
    if isinstance(detail, dict):
        for value in detail.values():
            return _first_message(value)
    if isinstance(detail, (list, tuple)) and detail:
        return _first_message(detail[0])
    return str(detail) if detail else GENERIC


def exception_handler(exc, context):
    if isinstance(exc, ApiError):
        return Response({'message': exc.message, 'code': exc.code}, status=exc.status_code)
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return Response({'message': 'Войдите, чтобы продолжить', 'code': 'unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    if isinstance(exc, PermissionDenied):
        return Response({'message': 'Нет доступа', 'code': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, ValidationError):
        return Response({'message': _first_message(exc.detail), 'code': 'invalid'}, status=status.HTTP_400_BAD_REQUEST)
    response = drf_handler(exc, context)
    if response is not None:
        response.data = {'message': _first_message(response.data.get('detail', response.data)) if isinstance(response.data, dict) else GENERIC, 'code': None}
    return response


def not_found(message: str = 'Не найдено') -> ApiError:
    return ApiError(message, 404, 'not_found')


def forbidden(message: str = 'Нет доступа') -> ApiError:
    return ApiError(message, 403, 'forbidden')
