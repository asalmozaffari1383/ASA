"""User serializers: staff self-info and CEO-driven user management."""

from rest_framework import serializers

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
    signature_image = serializers.ImageField(
        required=False, allow_null=True, validators=[validate_image]
    )

    class Meta:
        model = User
        fields = ("id", "username", "password", "first_name", "last_name",
                  "role", "title", "is_active", "signature_image", *PERMISSION_FIELDS)
        read_only_fields = ("id",)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
