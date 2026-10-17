"""DRF throttle classes (Part 5 §4 — Rate Limiting).

The public tracking endpoint accepts an 8-character code and returns request
status. Without rate limiting an anonymous client could enumerate codes to harvest
other applicants' data, so we cap anonymous hits hard. Rates are configured under
``REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`` in settings (Step 3), keyed by the
``scope`` attributes below.
"""

from rest_framework.throttling import AnonRateThrottle


class TrackingRateThrottle(AnonRateThrottle):
    """Protects ``GET /api/requests/track/`` from tracking-code brute force."""

    scope = "tracking"


class BaleCreateRateThrottle(AnonRateThrottle):
    """Protects the unauthenticated Bale intake endpoint from abuse."""

    scope = "bale_create"


class PublicSubmitRateThrottle(AnonRateThrottle):
    """Limits anonymous submissions to the public application form."""

    scope = "public_submit"


class PostalCodeCheckRateThrottle(AnonRateThrottle):
    """Caps the anonymous duplicate-postal-code lookup to deter enumeration."""

    scope = "postal_code_check"
