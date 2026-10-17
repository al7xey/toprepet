from django.urls import path

from . import views

urlpatterns = [
    path('requests', views.RequestsView.as_view()),
    path('me/requests', views.MyRequestsView.as_view()),
    path('requests/<str:request_id>', views.RequestDetailView.as_view()),
    path('requests/<str:request_id>/close', views.CloseRequestView.as_view()),
    path('requests/<str:request_id>/responses', views.ResponsesView.as_view()),
    path('me/responses', views.MyResponsesView.as_view()),
]
