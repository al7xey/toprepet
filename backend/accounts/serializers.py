from rest_framework import serializers


NOTIFY_DEFAULTS = {'lessons': True, 'messages': True, 'reminders': True}


def user_json(user) -> dict:
    data = {
        'id': user.id, 'role': user.role, 'name': user.name, 'email': user.email, 'emailVerified': user.email_verified,
        'timezone': user.timezone, 'onboarded': user.onboarded, 'photo': user.photo or None,
        'notifications': {**NOTIFY_DEFAULTS, **(user.notify_prefs or {})},
    }
    if user.role == 'tutor' and user.tutor_id:
        data['tutorId'] = user.tutor_id
    return data


class SignupIn(serializers.Serializer):
    role = serializers.ChoiceField(choices=['student', 'tutor'])
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False,
                                     error_messages={'min_length': 'Пароль должен быть не короче 8 символов'})


class LoginIn(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, trim_whitespace=False)


class OnboardingIn(serializers.Serializer):
    forWhom = serializers.CharField(max_length=120, allow_blank=True, required=False)
    subjects = serializers.ListField(child=serializers.CharField(max_length=80), max_length=12, required=False)
    goal = serializers.CharField(max_length=200, allow_blank=True, required=False)


class MePatchIn(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    timezone = serializers.CharField(max_length=64, required=False)
    notifications = serializers.DictField(child=serializers.BooleanField(), required=False)


class PasswordChangeIn(serializers.Serializer):
    current = serializers.CharField(max_length=128, trim_whitespace=False)
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False)


class ResetConfirmIn(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False)


class EmailIn(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class TokenIn(serializers.Serializer):
    token = serializers.CharField(max_length=128)
