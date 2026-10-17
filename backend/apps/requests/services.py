"""Centralized status state machine for InspectionRequest.

Every status change in the system flows through :func:`transition_to`. This is the
single place that knows which transitions are legal, performs them atomically under
a row lock (so two concurrent actors can't both advance the same request), and fires
the transactional SMS hooks — but only *after* the database transaction commits, so
a customer is never texted about a change that later rolled back.
"""

from django.conf import settings
from django.db import transaction

from apps.common.sms import SmsDeliveryError, get_sms_service

from .models import InspectionRequest

_S = InspectionRequest.Status

# Legal forward transitions. Anything not listed is rejected.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    _S.PENDING_REVIEW: {_S.PENDING_PAYMENT},
    _S.BALE_PHOTO_UPLOADED: {_S.PENDING_PAYMENT},
    _S.PENDING_PAYMENT: {_S.SCHEDULED},
    _S.SCHEDULED: {_S.UNDER_REVIEW},
    _S.UNDER_REVIEW: {_S.COMPLETED},
    _S.COMPLETED: set(),
}

# Transitions that trigger a transactional SMS to the applicant, mapped to the
# Kavenegar template name (overridable via settings/env).
_STATUS_SMS_TEMPLATES = {
    _S.UNDER_REVIEW: lambda: getattr(
        settings, "SMS_TEMPLATE_REPORT_READY", "asa-report-ready"
    ),
    _S.COMPLETED: lambda: getattr(
        settings, "SMS_TEMPLATE_CERTIFICATE_READY", "asa-certificate-ready"
    ),
}


class InvalidTransition(Exception):
    """Raised when a requested status change is not permitted from the current state."""


def _send_status_sms(receptor: str, template: str, token: str):
    """Return a zero-arg callable for ``transaction.on_commit``."""

    def _runner():
        try:
            get_sms_service().send_template(
                receptor=receptor, template=template, token=token
            )
        except SmsDeliveryError:
            # Logged inside the backend; a texting outage must not break the flow.
            pass

    return _runner


@transaction.atomic
def transition_to(request, target: str, *, extra_fields=None) -> InspectionRequest:
    """Atomically move ``request`` to ``target`` status.

    The row is locked with ``select_for_update`` for the duration of the
    transaction to prevent racing transitions. On success, any SMS hook bound to
    the target status is scheduled to fire after commit.

    Raises :class:`InvalidTransition` if the move is not allowed.
    """
    pk = getattr(request, "pk", request)
    locked = InspectionRequest.objects.select_for_update().get(pk=pk)

    if target not in ALLOWED_TRANSITIONS.get(locked.status, set()):
        raise InvalidTransition(
            f"تغییر وضعیت از «{locked.get_status_display()}» به این حالت مجاز نیست."
        )

    locked.status = target
    locked.save(update_fields=["status", *(extra_fields or [])])

    template_factory = _STATUS_SMS_TEMPLATES.get(target)
    if template_factory and locked.ceo_phone:
        transaction.on_commit(
            _send_status_sms(
                locked.ceo_phone, template_factory(), locked.tracking_code
            )
        )
    return locked
