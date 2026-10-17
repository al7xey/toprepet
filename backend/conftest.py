import os

os.environ.setdefault('FAST_HASH', '1')
os.environ.setdefault('AUTH_THROTTLE', '10000/min')
os.environ.setdefault('DEBUG', '1')

import pytest
from rest_framework.test import APIClient

ORIGIN = 'http://localhost:5173'


class Api(APIClient):
    """Клиент, который ведёт себя как браузер сайта: шлёт Origin и разбирает JSON."""

    def __init__(self, **kw):
        kw.setdefault('HTTP_ORIGIN', ORIGIN)
        super().__init__(**kw)

    def call(self, method, path, data=None, status=None, **extra):
        response = getattr(self, method)(path, data, format='json', **extra) if method not in ('get', 'delete') else getattr(self, method)(path, data or {}, **extra)
        if status is not None:
            assert response.status_code == status, f'{method.upper()} {path}: {response.status_code} {getattr(response, "data", response.content)}'
        return response

    def get_ok(self, path, data=None):
        return self.call('get', path, data, 200).json()

    def post_ok(self, path, data=None, status=200):
        response = self.call('post', path, data or {}, status)
        return response.json() if response.content else None

    def login_as(self, email, password='demo'):
        self.logout()
        return self.post_ok('/auth/login', {'email': email, 'password': password})


@pytest.fixture
def api(db):
    return Api()


@pytest.fixture
def client_factory(db):
    return Api
