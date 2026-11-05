from rest_framework import serializers


def boolean_input(data, key, *, default=None):
    field = serializers.BooleanField(required=default is None, default=default if default is not None else serializers.empty)
    return field.run_validation(data.get(key, serializers.empty))
