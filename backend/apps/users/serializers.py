"""User serializers: staff self-info and CEO-driven user management."""

from rest_framework import serializers
from django.db import transaction

from apps.common.validators import validate_image

from .models import User

PERMISSION_FIELDS = (
    "can_manage_financial",
    "can_fill_bale_forms",
    "can_do_inspection",
    "can_issue_certificate",
)


class CurrentUserSerializer(serializers.ModelSerializer):
    """Read-only profile for ``/api/users/me/`` — drives frontend route guards."""

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "role", "title",
                  "signature_image", *PERMISSION_FIELDS)
        read_only_fields = fields


class SelfProfileSerializer(serializers.ModelSerializer):
    """Self-service profile update for ``PATCH /api/users/me/``.

    Any authenticated staff member may update their own name and upload their
    transparent signature — the latter is what the certificate engine renders for
    the issuing user (Part 3 §4 / Part 5 §5). Role and permissions are *not*
    editable here (those remain CEO-only via user management).
    """

    signature_image = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_image]
    )

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "role", "title",
                  "signature_image")
        read_only_fields = ("id", "username", "role", "title")


class UserManagementSerializer(serializers.ModelSerializer):
    """Full CRUD serializer used by the CEO to manage staff (Part 3 §4).

    Lets the CEO assign a role, toggle each dynamic permission, and set the
    transparent signature image. ``password`` is write-only and hashed via
    ``set_password``.
    """

    password = serializers.CharField(
        write_only=True,
        required=False,
        style={"input_type": "password"},
        min_length=8,
    )
    current_password = serializers.CharField(write_only=True, required=False, trim_whitespace=False, max_length=256)
    signature_image = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_image]
    )

    class Meta:
        model = User
        fields = ("id", "username", "password", "current_password", "first_name", "last_name",
                  "role", "title", "is_active", "signature_image", *PERMISSION_FIELDS)
        read_only_fields = ("id",)

    def validate(self, attrs):
        if attrs.get("role") == User.Role.CEO or (self.instance and (self.instance.role == User.Role.CEO or self.instance.is_superuser)):
            from apps.financials.security import verify_current_password

            with transaction.atomic():
                actor = User.objects.select_for_update().get(pk=self.context["request"].user.pk)
                verification = verify_current_password(actor, attrs.get("current_password"))
            if verification != "valid":
                raise serializers.ValidationError({"current_password": "برای تغییر حساب مدیر، رمز فعلی خود را تأیید کنید. پس از ۵ خطا، ۱۵ دقیقه صبر کنید."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("current_password", None)
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop("current_password", None)
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
