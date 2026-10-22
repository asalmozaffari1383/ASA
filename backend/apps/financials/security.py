from datetime import timedelta

from django.utils import timezone

from .models import ConfigurationChange


def verify_current_password(actor, password):
    since = timezone.now() - timedelta(minutes=15)
    attempts = ConfigurationChange.objects.filter(
        actor=actor, action=ConfigurationChange.Action.PASSWORD_FAILED,
        created_at__gte=since,
    )
    if attempts.count() >= 5:
        return "locked"
    if not isinstance(password, str) or len(password) > 256 or not actor.check_password(password):
        ConfigurationChange.objects.create(
            actor=actor, actor_username=actor.username,
            action=ConfigurationChange.Action.PASSWORD_FAILED,
        )
        return "invalid"
    return "valid"
