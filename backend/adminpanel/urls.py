from django.urls import path

from . import views

urlpatterns = [
    path('admin/cancellations', views.Cancellations.as_view()),
    path('admin/disputes', views.Disputes.as_view()),
    path('admin/disputes/<str:dispute_id>/resolve', views.ResolveDispute.as_view()),
    path('admin/reviews', views.ReviewQueue.as_view()),
    path('admin/reviews/<str:review_id>', views.ModerateReview.as_view()),
    path('admin/profiles', views.ProfileQueue.as_view()),
    path('admin/profiles/<str:tutor_id>', views.ModerateProfile.as_view()),
]
