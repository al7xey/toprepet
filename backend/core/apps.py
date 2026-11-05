from django.apps import AppConfig
from django.db.backends.signals import connection_created


def sqlite_functions(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        connection.connection.create_function('unicode_lower', 1, lambda v: str(v).casefold() if v is not None else None, deterministic=True)
        connection.connection.create_function('json_text', 1, json_text, deterministic=True)


def json_text(value):
    import json
    return ' '.join(str(x) for x in json.loads(value or '[]'))


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        connection_created.connect(sqlite_functions, dispatch_uid='core.sqlite_functions')
