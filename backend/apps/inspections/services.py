"""Inspection domain services: defects, certificate gating, notifications.

The InspectionReport encodes a fixed catalogue of possible defects (Part 2 §4).
Rather than scatter the field names across views, we describe each defect once here
and derive everything (outstanding lists, certificate readiness, the client-facing
fix workflow) from that single source of truth.
"""

from dataclasses import dataclass
from typing import Callable

from apps.financials.models import FinancialRecord


@dataclass(frozen=True)
class DefectDefinition:
    """One potential defect on an inspection report."""

    key: str  # stable identifier used in URLs and the API payload
    label: str  # human-readable Persian label
    is_flagged: Callable[[object], bool]  # did the expert raise this defect?
    comment_field: str
    fixed_field: str  # the admin "is fixed" toggle
    fix_image_field: str  # applicant's proof-of-fix image


# The cylinders defect is "raised" when the expert specifies any required cylinders,
# so its predicate is a count check rather than a single boolean.
DEFECTS: tuple[DefectDefinition, ...] = (
    DefectDefinition(
        key="alarm",
        label="فضای مسقف بدون سیستم اعلام حریق",
        is_flagged=lambda r: r.has_covered_space_without_alarm,
        comment_field="covered_space_comment",
        fixed_field="is_alarm_fixed",
        fix_image_field="alarm_fix_image",
    ),
    DefectDefinition(
        key="extinguishing",
        label="فقدان سیستم اطفاء حریق",
        is_flagged=lambda r: r.lacks_fire_extinguishing_system,
        comment_field="extinguishing_system_comment",
        fixed_field="is_extinguishing_fixed",
        fix_image_field="extinguishing_fix_image",
    ),
    DefectDefinition(
        key="cylinders",
        label="کمبود کپسول‌های اطفاء حریق",
        is_flagged=lambda r: (r.co2_cylinders_needed > 0)
        or (r.powder_gas_cylinders_needed > 0),
        comment_field="cylinders_comment",
        fixed_field="is_cylinders_fixed",
        fix_image_field="cylinders_fix_image",
    ),
    DefectDefinition(
        key="lease",
        label="نیاز به اصلاح اجاره‌نامه",
        is_flagged=lambda r: r.lease_fix_required,
        comment_field="lease_fix_comment",
        fixed_field="is_lease_fixed",
        fix_image_field="lease_fix_image",
    ),
    DefectDefinition(
        key="deed",
        label="نیاز به ارائه سند مالکیت",
        is_flagged=lambda r: r.deed_delivery_required,
        comment_field="deed_delivery_comment",
        fixed_field="is_deed_fixed",
        fix_image_field="deed_fix_image",
    ),
)

DEFECTS_BY_KEY = {d.key: d for d in DEFECTS}


def get_flagged_defects(report) -> list[DefectDefinition]:
    """Defects the expert actually raised on this report."""
    return [d for d in DEFECTS if d.is_flagged(report)]


def get_outstanding_defects(report) -> list[DefectDefinition]:
    """Flagged defects that are not yet marked fixed by an admin."""
    return [d for d in get_flagged_defects(report) if not getattr(report, d.fixed_field)]


def all_defects_fixed(report) -> bool:
    """True when every raised defect has been verified as fixed."""
    return not get_outstanding_defects(report)


def evaluate_certificate_readiness(inspection_request) -> dict:
    """Decide whether a certificate may be issued for a request.

    Two tiers of requirement:
      * **Hard blockers** (cannot be overridden): a submitted inspection report with
        every raised defect marked fixed.
      * **Soft check** (overridable with confirmation): the stage-2 (final
        settlement) payment being approved by finance.

    Returns:
      * ``can_issue`` — True when everything (hard + soft) is satisfied.
      * ``reasons`` — all human-readable blockers (hard + soft), for UI/400 bodies.
      * ``blocking_reasons`` — hard blockers only; issuance is impossible while any
        remain, even with confirmation.
      * ``payment_approved`` — whether the stage-2 receipt is approved.
      * ``can_force`` — True when only the payment check is outstanding, i.e. the
        certificate may be issued after an explicit confirmation.
    """
    reasons: list[str] = []
    blocking_reasons: list[str] = []

    # ``payments`` is prefetched by the calling viewsets; iterate in Python to avoid
    # an extra query.
    stage_2_approved = any(
        p.stage == FinancialRecord.Stage.STAGE_2 and p.is_approved
        for p in inspection_request.payments.all()
    )
    if not stage_2_approved:
        reasons.append("پرداخت تسویه نهایی (مرحله ۲) تأیید نشده است.")

    report = getattr(inspection_request, "report", None)
    if report is None:
        blocking_reasons.append("گزارش بازرسی هنوز ثبت نشده است.")
    else:
        for defect in get_outstanding_defects(report):
            blocking_reasons.append(f"نقص رفع‌نشده: {defect.label}")
    reasons.extend(blocking_reasons)

    return {
        "can_issue": not reasons,
        "reasons": reasons,
        "blocking_reasons": blocking_reasons,
        "payment_approved": stage_2_approved,
        "can_force": not blocking_reasons,
    }
