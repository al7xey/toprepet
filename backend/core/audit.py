from .models import SecurityEvent


def record(actor, action: str, object_id: str = '', outcome: str = ''):
    return SecurityEvent.objects.create(
        actor=actor if actor and actor.is_authenticated else None,
        action=action, object_id=str(object_id)[:100], outcome=outcome[:32],
    )
