from django.urls import path

from . import views

urlpatterns = [
    path('bookings', views.BookingView.as_view()),
    path('me/lessons', views.MyLessonsView.as_view()),
    path('lessons/<str:lesson_id>', views.LessonView.as_view()),
    path('lessons/<str:lesson_id>/cancel', views.CancelView.as_view()),
    path('lessons/<str:lesson_id>/move', views.MoveView.as_view()),
    path('lessons/<str:lesson_id>/move/answer', views.MoveAnswerView.as_view()),
    path('lessons/<str:lesson_id>/confirm', views.ConfirmView.as_view()),
    path('lessons/<str:lesson_id>/decline', views.DeclineView.as_view()),
    path('lessons/<str:lesson_id>/result', views.ResultView.as_view()),
    path('lessons/<str:lesson_id>/problem', views.ProblemView.as_view()),
    path('disputes/<str:dispute_id>', views.DisputeView.as_view()),
    path('disputes/<str:dispute_id>/reply', views.DisputeReplyView.as_view()),
    path('tutor/students', views.MyStudentsView.as_view()),
    path('me/tutors', views.MyTutorsView.as_view()),
]
