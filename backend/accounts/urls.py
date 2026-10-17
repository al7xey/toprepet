from django.urls import path

from . import views

urlpatterns = [
    path('auth/me', views.MeView.as_view()),
    path('me', views.MeView.as_view()),
    path('auth/login', views.LoginView.as_view()),
    path('auth/yandex', views.YandexView.as_view()),
    path('auth/signup', views.SignupView.as_view()),
    path('auth/logout', views.LogoutView.as_view()),
    path('auth/password-reset', views.PasswordResetView.as_view()),
    path('auth/password-reset/confirm', views.PasswordResetConfirmView.as_view()),
    path('auth/verify/resend', views.ResendVerificationView.as_view()),
    path('auth/verify', views.VerifyEmailView.as_view()),
    path('me/onboarding', views.OnboardingView.as_view()),
]
