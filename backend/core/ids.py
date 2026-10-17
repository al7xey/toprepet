import secrets

from django.db import models


def new_id(prefix: str) -> str:
    return f'{prefix}-{secrets.token_hex(4)}'


class ShortIdField(models.CharField):
    """Строковый первичный ключ вида `l-ab12cd34`: ID в контракте — строки, и демо-данные задают их явно (`l-4`)."""

    def __init__(self, prefix: str = 'x', *args, **kwargs):
        self.prefix = prefix
        kwargs.setdefault('max_length', 40)
        kwargs['primary_key'] = True
        kwargs['editable'] = False
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs.pop('primary_key', None)
        kwargs.pop('editable', None)
        kwargs['prefix'] = self.prefix
        return name, path, args, kwargs

    def pre_save(self, model_instance, add):
        value = getattr(model_instance, self.attname)
        if not value:
            value = new_id(self.prefix)
            setattr(model_instance, self.attname, value)
        return value
