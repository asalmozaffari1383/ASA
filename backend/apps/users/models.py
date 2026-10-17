"""Custom user model implementing dynamic Role-Based Access Control (RBAC).

Per Part 2 §1 of the technical document. The model keeps a coarse ``role`` label
(used for routing/UI) while the *real* authorization decisions are driven by the
four dynamic boolean permissions below. DRF permission classes (Step 4) read these
booleans directly, so a CEO can, for example, grant a secretary the ability to fill
Bale forms without changing their role.
"""

import uuid

from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import validate_image


class UserManager(DjangoUserManager):
    """Username-based manager.

    Django's default ``UserManager`` already keys off ``username``; we subclass it
    only to make the dependency explicit and to leave a hook for future logic
    (e.g. forcing ``role`` on superusers).
    """

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # A superuser is, organisationally, the CEO and holds every dynamic
        # permission. This keeps `createsuperuser` immediately useful in dev.
        extra_fields.setdefault("role", User.Role.CEO)
        extra_fields.setdefault("can_manage_financial", True)
        extra_fields.setdefault("can_fill_bale_forms", True)
        extra_fields.setdefault("can_do_inspection", True)
        extra_fields.setdefault("can_issue_certificate", True)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Staff account (CEO / expert / secretary). Applicants are *not* users."""

    class Role(models.TextChoices):
        CEO = "ceo", _("مدیرعامل")
        EXPERT = "expert", _("کارشناس")
        SECRETARY = "secretary", _("منشی")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("شناسه"),
    )
    # `username`/`password` are inherited from AbstractUser (username is unique).
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SECRETARY,
        db_index=True,
        verbose_name=_("نقش"),
    )
    title = models.CharField(
        max_length=120,
        blank=True,
        default="",
        verbose_name=_("سمت"),
        help_text=_("سمت یا عنوان شغلی کاربر (مثلاً «کارشناس ارشد ایمنی»)."),
    )
    signature_image = models.ImageField(
        upload_to="signatures/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر امضا"),
        help_text=_("امضای شفاف برای درج روی گواهی‌نامه‌ها."),
    )

    # --- Dynamic permissions (RBAC) ---------------------------------------
    can_manage_financial = models.BooleanField(
        default=False, verbose_name=_("مدیریت امور مالی")
    )
    can_fill_bale_forms = models.BooleanField(
        default=False, verbose_name=_("تکمیل فرم‌های بله")
    )
    can_do_inspection = models.BooleanField(
        default=False, verbose_name=_("انجام بازرسی")
    )
    can_issue_certificate = models.BooleanField(
        default=False, verbose_name=_("صدور گواهی‌نامه")
    )

    objects = UserManager()

    class Meta:
        verbose_name = _("کاربر")
        verbose_name_plural = _("کاربران")

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
