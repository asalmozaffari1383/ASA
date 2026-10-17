"""Serializers for inspection reports and their photos."""

from rest_framework import serializers

from .models import InspectionPhoto, InspectionReport

# Defect-fix state is set after the inspection — by the client (proof images) and
# the CEO (verification toggles) — so it is read-only on the expert's report form.
_FIX_STATE_FIELDS = (
    "is_alarm_fixed", "alarm_fix_image",
    "is_extinguishing_fixed", "extinguishing_fix_image",
    "is_cylinders_fixed", "cylinders_fix_image",
    "is_lease_fixed", "lease_fix_image",
    "is_deed_fixed", "deed_fix_image",
)

# What the expert actually fills in during the inspection.
_EXPERT_FIELDS = (
    "has_covered_space_without_alarm", "covered_space_comment",
    "lacks_fire_extinguishing_system", "extinguishing_system_comment",
    "co2_cylinders_needed", "powder_gas_cylinders_needed", "cylinders_comment",
    "lease_fix_required", "lease_fix_comment",
    "deed_delivery_required", "deed_delivery_comment",
    "additional_notes",
)


class InspectionPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionPhoto
        fields = ("id", "photo", "uploaded_at")
        read_only_fields = fields


class InspectionReportSerializer(serializers.ModelSerializer):
    """Expert's report submission + full read representation.

    Photos are uploaded as repeated ``uploaded_photos`` multipart files and handled
    in the view (more robust than nesting file lists in the serializer); they are
    returned read-only under ``photos``.
    """

    photos = InspectionPhotoSerializer(many=True, read_only=True)
    expert_username = serializers.CharField(source="expert.username", read_only=True)

    class Meta:
        model = InspectionReport
        fields = ("id", "request", "expert", "expert_username", "inspection_date",
                  "photos", *_EXPERT_FIELDS, *_FIX_STATE_FIELDS)
        read_only_fields = ("id", "expert", "expert_username", "inspection_date",
                            "photos", *_FIX_STATE_FIELDS)

    def validate_request(self, value):
        if value.status != value.Status.SCHEDULED:
            raise serializers.ValidationError(
                "تنها برای درخواست‌های زمان‌بندی‌شده می‌توان گزارش ثبت کرد."
            )
        if InspectionReport.objects.filter(request=value).exists():
            raise serializers.ValidationError("برای این درخواست قبلاً گزارش ثبت شده است.")
        return value


class DefectVerificationSerializer(serializers.ModelSerializer):
    """CEO defect verification — toggling the ``is_*_fixed`` flags (Part 3 §4)."""

    class Meta:
        model = InspectionReport
        fields = ("is_alarm_fixed", "is_extinguishing_fixed", "is_cylinders_fixed",
                  "is_lease_fixed", "is_deed_fixed")
