"""Financial serializers: payment records and the system configuration singleton."""

from rest_framework import serializers

from apps.common.validators import validate_receipt_image

from .models import FinancialRecord, SystemConfiguration


class FinancialRecordSerializer(serializers.ModelSerializer):
    """Read view of a payment for the CEO financial dashboard."""

    tracking_code = serializers.CharField(
        source="request.tracking_code", read_only=True
    )
    company_name = serializers.CharField(
        source="request.company_name", read_only=True
    )
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    approved_by_username = serializers.CharField(
        source="approved_by.username", read_only=True, default=None
    )
    # Explicitly run the Step 2 MIME/size validator on the uploaded receipt.
    receipt_image = serializers.ImageField(validators=[validate_receipt_image])

    class Meta:
        model = FinancialRecord
        fields = ("id", "tracking_code", "company_name", "stage", "stage_display",
                  "amount_charged", "receipt_image", "is_approved",
                  "approved_by", "approved_by_username", "created_at")
        # Amount comes from system settings; approval state is changed only via the
        # dedicated approve/reject actions, never by a plain write.
        read_only_fields = ("id", "amount_charged", "is_approved",
                            "approved_by", "created_at")


class SystemConfigurationSerializer(serializers.ModelSerializer):
    """CEO-editable dynamic settings (payment amounts, bot card number)."""

    class Meta:
        model = SystemConfiguration
        fields = ("stage_1_amount", "stage_2_amount", "ceo_card_number",
                  "allow_inspection_without_advance", "updated_at")
        read_only_fields = ("updated_at",)
