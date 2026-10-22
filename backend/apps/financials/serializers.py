"""Financial serializers: payment records and the system configuration singleton."""

from rest_framework import serializers

from apps.common.validators import validate_receipt_image

from .models import ConfigurationChange, FinancialRecord, SystemConfiguration


PAYMENT_FIELDS = ("stage_1_amount", "stage_2_amount", "ceo_card_number", "ceo_account_number", "ceo_iban", "ceo_account_holder")


def latin_digits(value):
    return value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))


class BotSettingsSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=256)
    expected_updated_at = serializers.DateTimeField(write_only=True)
    recent_changes = serializers.SerializerMethodField()

    class Meta:
        model = SystemConfiguration
        fields = (*PAYMENT_FIELDS, "updated_at", "current_password", "expected_updated_at", "recent_changes")
        read_only_fields = ("updated_at",)

    def get_recent_changes(self, instance):
        return ConfigurationChangeSerializer(ConfigurationChange.objects.filter(action=ConfigurationChange.Action.UPDATED)[:20], many=True).data

    def validate_ceo_card_number(self, value):
        value = latin_digits(value).replace(" ", "").replace("-", "")
        if value:
            if len(value) != 16 or not value.isascii() or not value.isdigit() or len(set(value)) == 1:
                raise serializers.ValidationError("شماره کارت باید ۱۶ رقم معتبر باشد.")
            total = sum((int(digit) * (2 if index % 2 == 0 else 1)) // 10 + (int(digit) * (2 if index % 2 == 0 else 1)) % 10 for index, digit in enumerate(value))
            if total % 10:
                raise serializers.ValidationError("شماره کارت معتبر نیست.")
        return value

    def validate_ceo_account_number(self, value):
        value = latin_digits(value).replace(" ", "").replace("-", "")
        if value and (not value.isascii() or not value.isdigit() or not 6 <= len(value) <= 30 or not int(value)):
            raise serializers.ValidationError("شماره حساب باید بین ۶ تا ۳۰ رقم باشد.")
        return value

    def validate_ceo_iban(self, value):
        value = latin_digits(value).replace(" ", "").replace("-", "").upper()
        if value:
            if not value.startswith("IR") or len(value) != 26 or not value[2:].isascii() or not value[2:].isdigit():
                raise serializers.ValidationError("شماره شبا باید IR و ۲۴ رقم باشد.")
            if int(value[4:] + "1827" + value[2:4]) % 97 != 1:
                raise serializers.ValidationError("شماره شبا معتبر نیست.")
        return value

    def validate(self, attrs):
        unknown = set(self.initial_data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError("فیلد ناشناخته در درخواست وجود دارد.")
        for field in ("current_password", "expected_updated_at"):
            if field not in attrs:
                raise serializers.ValidationError({field: "این فیلد الزامی است."})
        amount = attrs.get("stage_1_amount", self.instance.stage_1_amount)
        final_amount = attrs.get("stage_2_amount", self.instance.stage_2_amount)
        if amount <= 0 or final_amount < 0:
            raise serializers.ValidationError("پیش‌پرداخت باید بیشتر از صفر و مبلغ تسویه نامنفی باشد.")
        if not any(attrs.get(field, getattr(self.instance, field)) for field in ("ceo_card_number", "ceo_account_number", "ceo_iban")):
            raise serializers.ValidationError("حداقل یک شماره کارت، حساب یا شبا وارد کنید.")
        if not attrs.get("ceo_account_holder", self.instance.ceo_account_holder).strip():
            raise serializers.ValidationError({"ceo_account_holder": "نام صاحب حساب الزامی است."})
        return attrs


class ConfigurationChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurationChange
        fields = ("id", "actor_username", "before", "after", "created_at")


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
        fields = (*PAYMENT_FIELDS,
                  "allow_inspection_without_advance", "updated_at")
        read_only_fields = (*PAYMENT_FIELDS, "updated_at")

    def validate(self, attrs):
        if set(self.initial_data) - {"allow_inspection_without_advance"}:
            raise serializers.ValidationError("برای تغییر اطلاعات پرداخت از بخش تنظیمات بات استفاده کنید.")
        return attrs

    def update(self, instance, validated_data):
        if "allow_inspection_without_advance" in validated_data:
            instance.allow_inspection_without_advance = validated_data["allow_inspection_without_advance"]
            instance.save(update_fields=["allow_inspection_without_advance", "updated_at"])
        return instance
