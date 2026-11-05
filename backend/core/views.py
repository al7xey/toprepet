"""HTTP boundary: deny access unless the endpoint explicitly declares itself public."""
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.views import APIView as DRFAPIView


class APIView(DRFAPIView):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and not isinstance(request.data, dict):
            raise ValidationError('Ожидается JSON-объект или форма с именованными полями')


class PublicAPIView(APIView):
    permission_classes = [AllowAny]


class RolePermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.role in view.roles)


class StudentAPIView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    roles = ('student',)


class TutorAPIView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    roles = ('tutor',)


class AdminAPIView(APIView):
    permission_classes = [IsAuthenticated, RolePermission]
    roles = ('admin',)
