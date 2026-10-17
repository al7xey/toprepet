from django.urls import path

from . import views

urlpatterns = [
    path('me/payments', views.PaymentsView.as_view()),
    path('me/cards', views.CardsView.as_view()),
    path('me/cards/<str:card_id>', views.CardDetailView.as_view()),
    path('tutor/finance', views.FinanceView.as_view()),
    path('tutor/payout', views.PayoutView.as_view()),
]
