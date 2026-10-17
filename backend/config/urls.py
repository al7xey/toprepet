from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({'ok': True})


urlpatterns = [
    path('health', health),
    path('', include('accounts.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
