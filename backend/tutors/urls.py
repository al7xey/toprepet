from django.urls import path

from . import views

urlpatterns = [
    path('tutors', views.TutorListView.as_view()),
    path('tutors/<str:tutor_id>', views.TutorDetailView.as_view()),
    path('tutors/<str:tutor_id>/slots', views.TutorSlotsView.as_view()),
    path('tutor/profile', views.MyProfileView.as_view()),
    path('tutor/profile/submit', views.SubmitProfileView.as_view()),
    path('tutor/schedule', views.WeekView.as_view()),
    path('tutor/schedule/exceptions', views.ExceptionsView.as_view()),
    path('tutor/schedule/exceptions/<str:date>', views.ExceptionDetailView.as_view()),
    path('tutor/photo', views.PhotoView.as_view()),
    path('tutor/documents', views.DocumentsView.as_view()),
]
