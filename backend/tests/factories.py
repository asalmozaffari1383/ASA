"""Helpers for building test fixtures (users, requests, payments, reports)."""

import itertools

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.financials.models import FinancialRecord
from apps.inspections.models import InspectionReport
from apps.requests.models import InspectionRequest

User = get_user_model()

# A genuine 1x1 PNG so the python-magic validator sees real image/png bytes.
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00"
    b"\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)

_counter = itertools.count(1)


def png_upload(name="img.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, PNG_BYTES, content_type="image/png")


def make_user(username=None, password="pw12345678", role="secretary", **flags) -> "User":
    username = username or f"user{next(_counter)}"
    return User.objects.create_user(username=username, password=password, role=role, **flags)


def make_request(status=InspectionRequest.Status.UNDER_REVIEW, **overrides) -> InspectionRequest:
    data = dict(
        company_name="شرکت آزمون",
        ceo_name="علی رضایی",
        ceo_phone="09123456789",
        address="تهران",
        activity_type="تولیدی",
        total_area_land=500,
        total_area_building=300,
        ownership_type=InspectionRequest.Ownership.MALKI,
        inspection_type=InspectionRequest.InspectionType.INITIAL,
        status=status,
    )
    data.update(overrides)
    return InspectionRequest.objects.create(**data)


def make_payment(request, stage, approved=False, approver=None) -> FinancialRecord:
    return FinancialRecord.objects.create(
        request=request,
        stage=stage,
        amount_charged=1_000_000,
        receipt_image=png_upload(f"{stage}.png"),
        is_approved=approved,
        approved_by=approver,
    )


def make_report(request, expert=None, **fields) -> InspectionReport:
    expert = expert or make_user(role="expert", can_do_inspection=True)
    return InspectionReport.objects.create(request=request, expert=expert, **fields)
