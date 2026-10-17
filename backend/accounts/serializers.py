from rest_framework import serializers


def user_json(user) -> dict:
    data = {
        'id': user.id, 'role': user.role, 'name': user.name, 'email': user.email, 'emailVerified': user.email_verified,
        'timezone': user.timezone, 'onboarded': user.onboarded,
    }
    if user.role == 'tutor' and user.tutor_id:
        data['tutorId'] = user.tutor_id
    return data


class SignupIn(serializers.Serializer):
    role = serializers.ChoiceField(choices=['student', 'tutor'])
    name = serializers.CharField(max_length=120, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, max_length=128, trim_whitespace=False,
                                     error_messages={'min_length': 'Пароль должен быть не короче 8 символов'})


class LoginIn(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False)


class OnboardingIn(serializers.Serializer):
    forWhom = serializers.CharField(allow_blank=True, required=False)
    subjects = serializers.ListField(child=serializers.CharField(), required=False)
    goal = serializers.CharField(allow_blank=True, required=False)


class MePatchIn(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False)
    timezone = serializers.CharField(max_length=64, required=False)
