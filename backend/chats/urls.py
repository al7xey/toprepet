from django.urls import path

from . import views

urlpatterns = [
    path('me/conversations', views.ConversationsView.as_view()),
    path('conversations', views.ConversationsView.as_view()),
    path('conversations/<str:conversation_id>', views.ConversationView.as_view()),
    path('conversations/<str:conversation_id>/messages', views.MessagesView.as_view()),
    path('conversations/<str:conversation_id>/messages/<str:message_id>', views.MessageView.as_view()),
    path('conversations/<str:conversation_id>/report', views.ReportView.as_view()),
]
