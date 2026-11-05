from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({'ok': True})


def readiness(_request):
    from django.db import connection, DatabaseError
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except DatabaseError:
        return JsonResponse({'ok': False}, status=503)
    response = JsonResponse({'ok': True})
    response['Cache-Control'] = 'no-store'
    return response


def email_token(request):
    from core.testmail import last_token

    return JsonResponse({'token': last_token(request.GET.get('email', ''), request.GET.get('kind', 'verify'))})


urlpatterns = [
    path('health', health),
    path('ready', readiness),
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

handler400 = 'core.errors.bad_request'
handler500 = 'core.errors.server_error'
