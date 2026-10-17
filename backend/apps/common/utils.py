"""Shared helpers used across apps.

Step 2 of the plan adds file validators, S3 storages, the SMS service and
throttles to this package. For Step 1 we only need the tracking-code generator,
which the ``InspectionRequest`` model relies on.
"""

import secrets

# Tracking codes look like ``ASA-49F2``: a fixed prefix plus 4 uppercase hex
# characters, for a total length of 8 (matching ``InspectionRequest.tracking_code``
# ``max_length``). ``secrets`` is used instead of ``random`` so codes are not
# predictable, which matters because the public tracking endpoint is reachable by
# anyone holding a code.
TRACKING_CODE_PREFIX = "ASA-"
TRACKING_CODE_HEX_BYTES = 2  # 2 bytes -> 4 hex characters
TRACKING_CODE_LENGTH = len(TRACKING_CODE_PREFIX) + TRACKING_CODE_HEX_BYTES * 2


def generate_tracking_code() -> str:
    """Return a single random tracking code such as ``ASA-49F2``.

    Uniqueness is enforced at the database level (unique index) and retried by
    the model's ``save`` method on the rare chance of a collision.
    """
    suffix = secrets.token_hex(TRACKING_CODE_HEX_BYTES).upper()
    return f"{TRACKING_CODE_PREFIX}{suffix}"
