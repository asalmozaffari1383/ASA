"""Serializers for the inspection-request lifecycle.

Covers every entry/exit point of an InspectionRequest: public website intake, Bale
bot intake, the secretary's digital-form view, staff detail views, and the
anonymous client tracking payload.
"""

from django.core.files.storage import default_storage
from rest_framework import serializers
from rest_framework.reverse import reverse

from apps.common.validators import (
    validate_document,
    validate_form_photo,
    validate_image,
    validate_receipt_image,
)
from apps.financials.models import FinancialRecord
from apps.financials.serializers import FinancialRecordSerializer
from apps.financials.services import create_payment
from apps.inspections.serializers import InspectionReportSerializer
from apps.inspections.services import get_outstanding_defects

from .models import InspectionRequest

# Applicant + technical fields shared by the public form and the secretary form.
_APPLICANT_FIELDS = (
    "company_name", "ceo_name", "ceo_phone", "backup_phone", "address",
    "postal_code", "activity_type", "referrer_name", "total_area_land",
    "total_area_building", "ownership_type", "inspection_type",
)
_SYSTEM_STATUS_FIELDS = (
    "has_fire_extinguisher_system", "fire_extinguisher_details",
    "has_fire_alarm_system", "fire_alarm_details",
    "has_earthing_system", "earthing_year",
)


def certificate_url_for(instance):
    """Signed URL for a request's issued certificate PDF, or ``None``.

    ``build_certificate`` persists the PDF to the deterministic storage path
    ``certificates/{tracking_code}.pdf`` (no URL is stored on the model), so the
    URL can be reconstructed once the request is ``completed``. Under the private
    S3 config this returns a short-lived signed URL.
    """
    if instance.status != InspectionRequest.Status.COMPLETED:
        return None
    try:
        return default_storage.url(f"certificates/{instance.tracking_code}.pdf")
    except Exception:  # pragma: no cover - storage misconfig shouldn't break the view
        return None


def normalize_iranian_phone(raw: str) -> str:
    """Coerce a phone number into the canonical ``09xxxxxxxxx`` form.

    Bale's shared-contact payload may arrive as ``+98912...`` or ``98912...``;
    normalise so it satisfies the model's regex validator.
    """
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits.startswith("98"):
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    return digits


class PublicSubmitSerializer(serializers.ModelSerializer):
    """Public website wizard handler (Part 3 §1).

    Creates the request in ``pending_payment`` and spins up the stage-1 payment
    record from the uploaded down-payment receipt (amount taken from system
    settings). The missing-deed edge case is surfaced by the view as response
    metadata — submission is never blocked on it.
    """

    deed_file = serializers.FileField(
        required=False, allow_null=True, validators=[validate_document]
    )
    lease_file = serializers.FileField(
        required=False, allow_null=True, validators=[validate_document]
    )
    postal_code_document = serializers.FileField(
        required=False, allow_null=True, validators=[validate_document]
    )
    # Not a model field on the request: the stage-1 receipt, used to create the
    # FinancialRecord. Optional only when the CEO has enabled
    # ``allow_inspection_without_advance`` (validated in ``validate``).
    stage_1_receipt = serializers.ImageField(
        write_only=True, required=False, allow_null=True,
        validators=[validate_receipt_image],
    )

    class Meta:
        model = InspectionRequest
        fields = ("id", "tracking_code", "status", "request_date",
                  *_APPLICANT_FIELDS, *_SYSTEM_STATUS_FIELDS,
                  "deed_file", "lease_file", "postal_code_document",
                  "stage_1_receipt")
        read_only_fields = ("id", "tracking_code", "status", "request_date")

    def validate(self, attrs):
        # The advance-payment receipt is only skippable when the CEO has turned on
        # "allow inspection without advance"; otherwise a website registration
        # still implies an upfront payment.
        if not attrs.get("stage_1_receipt"):
            from apps.financials.models import SystemConfiguration

            if not SystemConfiguration.load().allow_inspection_without_advance:
                raise serializers.ValidationError(
                    {"stage_1_receipt": "بارگذاری رسید پیش‌پرداخت الزامی است."}
                )
        return attrs

    def create(self, validated_data):
        # Website requests wait in ``pending_review`` for an admin to review, edit
        # and approve before the payment/scheduling workflow continues.
        receipt = validated_data.pop("stage_1_receipt", None)
        instance = InspectionRequest.objects.create(
            source=InspectionRequest.Source.WEBSITE,
            status=InspectionRequest.Status.PENDING_REVIEW,
            **validated_data,
        )
        if receipt:
            create_payment(instance, FinancialRecord.Stage.STAGE_1, receipt)
        return instance


class BaleCreateSerializer(serializers.Serializer):
    """Bale bot intake (Part 4 final action).

    Accepts only a phone number and two images; the full applicant data is filled
    in later by the secretary. Registers the request in ``bale_photo_uploaded`` and
    creates the stage-1 payment from the down-payment receipt.
    """

    phone = serializers.CharField(max_length=15)
    form_photo = serializers.ImageField(validators=[validate_form_photo])
    receipt_photo = serializers.ImageField(validators=[validate_receipt_image])

    def validate_phone(self, value):
        normalized = normalize_iranian_phone(value)
        if len(normalized) != 11 or not normalized.startswith("09"):
            raise serializers.ValidationError("شماره موبایل نامعتبر است.")
        return normalized

    def create(self, validated_data):
        # The applicant fields are unknown at Bale-intake time; they are stored as
        # empty placeholders for the secretary to complete from the form photo.
        instance = InspectionRequest.objects.create(
            source=InspectionRequest.Source.BALE,
            status=InspectionRequest.Status.BALE_PHOTO_UPLOADED,
            ceo_phone=validated_data["phone"],
            bale_form_photo=validated_data["form_photo"],
            company_name="",
            ceo_name="",
            address="",
            activity_type="",
            total_area_land=0,
            total_area_building=0,
            ownership_type="",
            inspection_type="",
        )
        create_payment(
            instance, FinancialRecord.Stage.STAGE_1, validated_data["receipt_photo"]
        )
        return instance

    def to_representation(self, instance):
        return {
            "id": str(instance.id),
            "tracking_code": instance.tracking_code,
            "status": instance.status,
        }


class SecretaryRequestSerializer(serializers.ModelSerializer):
    """Secretary split-screen digital form (Part 3 §2).

    The bale form photo and the down-payment receipt are exposed read-only for the
    image viewer; the applicant/technical fields are editable so the secretary can
    transcribe the handwritten form.
    """

    receipt_image_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    advance_paid = serializers.SerializerMethodField()

    class Meta:
        model = InspectionRequest
        fields = ("id", "tracking_code", "source", "status", "status_display",
                  "request_date", "advance_paid",
                  *_APPLICANT_FIELDS, *_SYSTEM_STATUS_FIELDS,
                  "bale_form_photo", "receipt_image_url",
                  "postal_code_document")
        read_only_fields = ("id", "tracking_code", "source", "status",
                            "status_display", "request_date", "advance_paid",
                            "bale_form_photo")

    def _stage_1(self, obj):
        return next(
            (p for p in obj.payments.all()
             if p.stage == FinancialRecord.Stage.STAGE_1),
            None,
        )

    def get_receipt_image_url(self, obj):
        payment = self._stage_1(obj)
        if payment and payment.receipt_image:
            return self.context["request"].build_absolute_uri(
                payment.receipt_image.url
            )
        return None

    def get_advance_paid(self, obj):
        """Whether the stage-1 advance has been approved (for prioritisation)."""
        payment = self._stage_1(obj)
        return bool(payment and payment.is_approved)


class TrackingSerializer(serializers.Serializer):
    """Anonymous client tracking payload (Part 3 §5).

    Read-only. Builds the stepper state, the outstanding-defect list and the upload
    URLs the client needs while a request is ``under_review``.
    """

    # Stepper definition for the client-facing flow.
    STEP_ORDER = (
        ("pending_payment", "ثبت درخواست و پرداخت"),
        ("scheduled", "زمان‌بندی بازرسی"),
        ("under_review", "بررسی و رفع نواقص"),
        ("completed", "صدور گواهی‌نامه"),
    )

    def to_representation(self, instance):
        request = self.context["request"]
        is_under_review = instance.status == InspectionRequest.Status.UNDER_REVIEW

        return {
            "tracking_code": instance.tracking_code,
            "company_name": instance.company_name,
            "status": instance.status,
            "status_display": instance.get_status_display(),
            "current_step": self._current_step_index(instance.status),
            "steps": [
                {"key": key, "label": label} for key, label in self.STEP_ORDER
            ],
            "payments": self._payments(instance),
            "outstanding_defects": self._defects(instance, request, is_under_review),
            "is_under_review": is_under_review,
            "final_payment_upload_url": (
                reverse(
                    "requests:final-payment",
                    kwargs={"tracking_code": instance.tracking_code},
                    request=request,
                )
                if is_under_review
                else None
            ),
            "certificate_url": certificate_url_for(instance),
        }

    def _current_step_index(self, status):
        # Pre-registration states (Bale photo awaiting entry, website form
        # awaiting admin review) map to the first client step.
        if status in (
            InspectionRequest.Status.BALE_PHOTO_UPLOADED,
            InspectionRequest.Status.PENDING_REVIEW,
        ):
            return 0
        for index, (key, _label) in enumerate(self.STEP_ORDER):
            if key == status:
                return index
        return 0

    def _payments(self, instance):
        result = {}
        for payment in instance.payments.all():
            result[payment.stage] = {
                "amount": str(payment.amount_charged),
                "is_approved": payment.is_approved,
            }
        return result

    def _defects(self, instance, request, is_under_review):
        report = getattr(instance, "report", None)
        if report is None:
            return []
        defects = []
        for defect in get_outstanding_defects(report):
            fix_image = getattr(report, defect.fix_image_field)
            defects.append({
                "key": defect.key,
                "label": defect.label,
                "comment": getattr(report, defect.comment_field),
                "is_fixed": getattr(report, defect.fixed_field),
                "fix_image_url": (
                    request.build_absolute_uri(fix_image.url) if fix_image else None
                ),
                "upload_url": (
                    reverse(
                        "requests:fix-upload",
                        kwargs={
                            "tracking_code": instance.tracking_code,
                            "defect_key": defect.key,
                        },
                        request=request,
                    )
                    if is_under_review
                    else None
                ),
            })
        return defects


class FixUploadSerializer(serializers.Serializer):
    """Client proof-of-fix image upload for a single defect."""

    image = serializers.ImageField(validators=[validate_image])


class FinalPaymentSerializer(serializers.Serializer):
    """Client stage-2 settlement receipt upload."""

    receipt_image = serializers.ImageField(validators=[validate_receipt_image])


class StaffRequestListSerializer(serializers.ModelSerializer):
    """Compact card representation for staff list views (expert/CEO/secretary)."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = InspectionRequest
        fields = ("id", "tracking_code", "company_name", "ceo_name", "ceo_phone",
                  "source", "status", "status_display", "request_date")
        read_only_fields = fields


class CertificateIssueSerializer(serializers.Serializer):
    force = serializers.BooleanField(default=False)
    certificate_description = serializers.CharField(required=False, allow_blank=True, max_length=20000)
    certificate_number = serializers.CharField(required=False, allow_blank=True, max_length=80)
    certificate_usage_type = serializers.CharField(required=False, allow_blank=True, max_length=255)
    certificate_attachment = serializers.CharField(required=False, allow_blank=True, max_length=255)


class StaffRequestDetailSerializer(serializers.ModelSerializer):
    """Full request view with nested report + payments for CEO verification.

    Relies on the viewset prefetching ``payments`` and ``report__photos`` to stay
    free of N+1 queries.
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payments = FinancialRecordSerializer(many=True, read_only=True)
    report = InspectionReportSerializer(read_only=True)
    certificate_url = serializers.SerializerMethodField()
    certificate_default_description = serializers.SerializerMethodField()

    class Meta:
        model = InspectionRequest
        fields = ("id", "tracking_code", "source", "status", "status_display",
                  "request_date", *_APPLICANT_FIELDS, *_SYSTEM_STATUS_FIELDS,
                  "deed_file", "lease_file", "bale_form_photo",
                  "postal_code_document",
                  "payments", "report", "certificate_url", "certificate_description",
                  "certificate_number", "certificate_usage_type", "certificate_attachment",
                  "certificate_issued_at", "certificate_default_description")
        read_only_fields = fields

    def get_certificate_url(self, instance):
        return certificate_url_for(instance)

    def get_certificate_default_description(self, instance):
        from apps.certificates.content import DEFAULT_DESCRIPTION

        return DEFAULT_DESCRIPTION
