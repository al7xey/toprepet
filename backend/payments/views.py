import re

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from zoneinfo import ZoneInfo

from core.errors import ApiError, not_found
from core.perm import my_tutor, require_role, require_user
from core.utils import iso
from lessons.models import Lesson

from .models import Card, PaymentRecord, PayoutSettings
from .providers import get_provider


def card_json(c) -> dict:
    return {'id': c.id, 'brand': c.brand, 'last4': c.last4, 'primary': c.primary}


def payment_json(p) -> dict:
    return {'id': p.id, 'lessonId': p.lesson_id, 'title': p.title, 'amount': p.amount, 'kind': p.kind, 'at': iso(p.at), 'cardLast4': p.card_last4 or '••••'}


class PaymentsView(APIView):
    def get(self, request):
        user = require_user(request)
        return Response([payment_json(p) for p in PaymentRecord.objects.filter(user=user)])


class CardsView(APIView):
    def get(self, request):
        return Response([card_json(c) for c in require_user(request).cards.all()])

    def post(self, request):
        user = require_role(request, 'student')
        token = get_provider().tokenize_card(str(request.data.get('number', '')), str(request.data.get('expiry', '')), str(request.data.get('cvc', '')))
        card = Card.objects.create(user=user, brand=token.brand, last4=token.last4, provider_token=token.token, primary=not user.cards.exists())
        return Response(card_json(card), status=201)


class CardDetailView(APIView):
    def delete(self, request, card_id):
        user = require_user(request)
        card = user.cards.filter(id=card_id).first()
        if card is None:
            raise not_found('Карта не найдена')
        busy = Lesson.objects.filter(student=user, status='pending', payment='hold').exists()
        was_primary = card.primary
        card.delete()
        if was_primary:
            next_card = user.cards.first()
            if next_card:
                next_card.primary = True
                next_card.save(update_fields=['primary'])
        return Response(status=204)


class FinanceView(APIView):
    def get(self, request):
        tutor = my_tutor(request)
        lessons = list(Lesson.objects.filter(tutor=tutor, tutor_price__gt=0).select_related('student').order_by('start'))
        entries, available, pending, paid_month = [], 0, 0, 0
        now = timezone.now().astimezone(ZoneInfo(tutor.timezone))
        for l in lessons:
            status = 'paid' if l.payment == 'paid_out' else 'held' if l.payment == 'hold' else 'pending'
            entries.append({'id': l.id, 'title': f'{l.student.name}, {l.subject}', 'amount': l.tutor_price, 'status': status, 'at': iso(l.start)})
            if status != 'paid':
                pending += l.tutor_price
            if status == 'pending' and l.status == 'completed':
                available += l.tutor_price
            if status == 'paid' and l.paid_out_at and l.paid_out_at.astimezone(now.tzinfo).strftime('%Y-%m') == now.strftime('%Y-%m'):
                paid_month += l.tutor_price
        return Response({'available': available, 'pending': pending, 'paidThisMonth': paid_month, 'entries': entries})


def payout_json(p) -> dict:
    return {'inn': p.inn if p else '', 'cardLast4': (p.card_last4 or None) if p else None, 'selfEmployedConfirmed': bool(p and p.self_employed_confirmed)}


class PayoutView(APIView):
    def get(self, request):
        tutor = my_tutor(request)
        return Response(payout_json(getattr(tutor, 'payout', None)))

    def put(self, request):
        tutor = my_tutor(request)
        inn = str(request.data.get('inn', ''))
        if not re.fullmatch(r'\d{12}', inn):
            raise ApiError('ИНН самозанятого — 12 цифр')
        token = get_provider().tokenize_card(str(request.data.get('cardNumber', '')), '', '')
        settings_obj, _ = PayoutSettings.objects.update_or_create(tutor=tutor, defaults={'inn': inn, 'card_last4': token.last4, 'card_token': token.token, 'self_employed_confirmed': True})
        return Response(payout_json(settings_obj))
