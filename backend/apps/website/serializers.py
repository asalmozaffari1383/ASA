from rest_framework import serializers

from .models import CompanyPartner, ServiceCard


class ServiceCardSerializer(serializers.ModelSerializer):
    specs = serializers.JSONField(required=False)
    image_url = serializers.SerializerMethodField()
    clear_image = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ServiceCard
        fields = [
            "id", "title", "description", "details", "applications",
            "inspection_steps", "specs", "image", "image_url",
            "image_alt", "default_image", "position", "is_active",
            "updated_at", "clear_image",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_image_url(self, instance):
        return instance.image.url if instance.image else instance.default_image

    def validate(self, attrs):
        if attrs.get("clear_image") and attrs.get("image"):
            raise serializers.ValidationError("حذف و بارگذاری تصویر را هم‌زمان انتخاب نکنید.")
        return attrs

    def validate_specs(self, value):
        if not isinstance(value, list) or len(value) > 8:
            raise serializers.ValidationError("حداکثر ۸ ویژگی وارد کنید.")
        if any(not isinstance(item, str) or not item.strip() or len(item) > 100 for item in value):
            raise serializers.ValidationError("هر ویژگی باید متن غیرخالی و حداکثر ۱۰۰ کاراکتر باشد.")
        return [item.strip() for item in value]

    def create(self, validated_data):
        validated_data.pop("clear_image", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if validated_data.pop("clear_image", False):
            validated_data["image"] = None
        return super().update(instance, validated_data)


class CompanyPartnerSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = CompanyPartner
        fields = ["id", "name", "logo", "logo_url", "position", "is_active", "updated_at"]
        read_only_fields = ["id", "updated_at"]

    def get_logo_url(self, instance):
        return instance.logo.url if instance.logo else ""
