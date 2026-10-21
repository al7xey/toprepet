from django.urls import path

from . import views

urlpatterns = [
    path('me/notifications', views.NotificationsView.as_view()),
    path('me/notifications/read', views.ReadAllView.as_view()),
    path('me/notifications/<str:note_id>/read', views.ReadOneView.as_view()),
]
