from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({'ok': True})


def email_token(request):
    from core.testmail import last_token

    return JsonResponse({'token': last_token(request.GET.get('email', ''), request.GET.get('kind', 'verify'))})


urlpatterns = [
    path('health', health),
    path('', include('accounts.urls')),
    path('', include('tutors.urls')),
    path('', include('lessons.urls')),
    path('', include('payments.urls')),
    path('', include('notifications.urls')),
    path('', include('reviews.urls')),
    path('', include('requests_board.urls')),
    path('', include('chats.urls')),
    path('', include('adminpanel.urls')),
] + ([path('_test/email-token', email_token)] if settings.EXPOSE_TEST_ENDPOINTS else []) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
