from rest_framework.response import Response
from rest_framework.views import APIView

from core.perm import require_user
from core.utils import iso


def notification_json(n) -> dict:
    return {'id': n.id, 'kind': n.kind, 'title': n.title, 'text': n.text, 'at': iso(n.at), 'read': n.read, 'link': n.link}


class NotificationsView(APIView):
    def get(self, request):
        user = require_user(request)
        return Response([notification_json(n) for n in user.notifications.all()[:200]])


class ReadOneView(APIView):
    def post(self, request, note_id):
        require_user(request).notifications.filter(id=note_id).update(read=True)
        return Response(status=204)


class ReadAllView(APIView):
    def post(self, request):
        require_user(request).notifications.filter(read=False).update(read=True)
        return Response(status=204)
