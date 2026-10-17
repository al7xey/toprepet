from django.urls import path

from . import views

urlpatterns = [
    path('tutors/<str:tutor_id>/reviews', views.TutorReviewsView.as_view()),
    path('lessons/<str:lesson_id>/review', views.LessonReviewView.as_view()),
    path('reviews/<str:review_id>', views.ReviewView.as_view()),
    path('me/reviews', views.MyReviewsView.as_view()),
    path('reviews/<str:review_id>/reply', views.ReplyView.as_view()),
]
