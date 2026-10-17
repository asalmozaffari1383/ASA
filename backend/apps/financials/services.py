"""Financial domain services."""

from decimal import Decimal

from .models import FinancialRecord, SystemConfiguration


def get_stage_amount(stage: str) -> Decimal:
    """Return the configured amount for a payment stage.

    Centralises the "amount dynamically fetched from settings" rule so every place
    that creates a FinancialRecord captures the current configured price.
    """
    config = SystemConfiguration.load()
    if stage == FinancialRecord.Stage.STAGE_1:
        return config.stage_1_amount
    if stage == FinancialRecord.Stage.STAGE_2:
        return config.stage_2_amount
    raise ValueError(f"Unknown payment stage: {stage!r}")


def create_payment(request, stage: str, receipt_image) -> FinancialRecord:
    """Create (or replace) a pending payment for ``stage`` on ``request``.

    Uses ``update_or_create`` so re-uploading a receipt for the same stage replaces
    the previous (unapproved) one rather than violating the unique (request, stage)
    constraint.
    """
    record, _ = FinancialRecord.objects.update_or_create(
        request=request,
        stage=stage,
        defaults={
            "amount_charged": get_stage_amount(stage),
            "receipt_image": receipt_image,
            "is_approved": False,
            "approved_by": None,
        },
    )
    return record
