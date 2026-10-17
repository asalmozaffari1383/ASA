"""Inspection report + photos: the technical checklist and defect-fixing workflow.

Per Part 2 §4 and §5 of the technical document. The expert fills one report per
request (OneToOne). The report encodes a *parallel defect-fixing workflow*: each
potential defect is a small group of fields —

    has_*/lacks_*/*_required   the expert flags the defect exists
    *_comment                  the expert's note about it
    is_*_fixed                 admin toggle once the applicant proves the fix
    *_fix_image                applicant's proof-of-fix image

Certificate issuance (Step 5/6) is gated on every *flagged* defect having its
matching ``is_*_fixed`` set to True, plus an approved stage-2 payment.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import validate_image


class InspectionReport(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("شناسه"),
    )
    request = models.OneToOneField(
        "requests.InspectionRequest",
        on_delete=models.CASCADE,
        related_name="report",
        verbose_name=_("درخواست"),
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reports",
        verbose_name=_("کارشناس"),
    )
    inspection_date = models.DateTimeField(
        auto_now_add=True, verbose_name=_("تاریخ بازرسی")
    )

    # --- Defect 1: covered space without fire alarm -----------------------
    has_covered_space_without_alarm = models.BooleanField(
        default=False, verbose_name=_("فضای مسقف بدون اعلام حریق دارد")
    )
    covered_space_comment = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات فضای مسقف")
    )
    is_alarm_fixed = models.BooleanField(
        default=False, verbose_name=_("اعلام حریق رفع شد")
    )
    alarm_fix_image = models.ImageField(
        upload_to="reports/fixes/alarm/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر رفع نقص اعلام حریق"),
    )

    # --- Defect 2: missing fire extinguishing system ----------------------
    lacks_fire_extinguishing_system = models.BooleanField(
        default=False, verbose_name=_("فاقد سیستم اطفاء حریق")
    )
    extinguishing_system_comment = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات سیستم اطفاء حریق")
    )
    is_extinguishing_fixed = models.BooleanField(
        default=False, verbose_name=_("سیستم اطفاء حریق رفع شد")
    )
    extinguishing_fix_image = models.ImageField(
        upload_to="reports/fixes/extinguishing/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر رفع نقص اطفاء حریق"),
    )

    # --- Defect 3: cylinders needed ---------------------------------------
    co2_cylinders_needed = models.PositiveIntegerField(
        default=0, verbose_name=_("تعداد کپسول CO2 موردنیاز")
    )
    powder_gas_cylinders_needed = models.PositiveIntegerField(
        default=0, verbose_name=_("تعداد کپسول پودر و گاز موردنیاز")
    )
    cylinders_comment = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات کپسول‌ها")
    )
    is_cylinders_fixed = models.BooleanField(
        default=False, verbose_name=_("کپسول‌ها تأمین شد")
    )
    cylinders_fix_image = models.ImageField(
        upload_to="reports/fixes/cylinders/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر رفع نقص کپسول‌ها"),
    )

    # --- Defect 4: lease document fix -------------------------------------
    lease_fix_required = models.BooleanField(
        default=False, verbose_name=_("اصلاح اجاره‌نامه لازم است")
    )
    lease_fix_comment = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات اصلاح اجاره‌نامه")
    )
    is_lease_fixed = models.BooleanField(
        default=False, verbose_name=_("اجاره‌نامه اصلاح شد")
    )
    lease_fix_image = models.ImageField(
        upload_to="reports/fixes/lease/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر اصلاح اجاره‌نامه"),
    )

    # --- Defect 5: deed delivery ------------------------------------------
    deed_delivery_required = models.BooleanField(
        default=False, verbose_name=_("ارائه سند مالکیت لازم است")
    )
    deed_delivery_comment = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات ارائه سند")
    )
    is_deed_fixed = models.BooleanField(
        default=False, verbose_name=_("سند مالکیت ارائه شد")
    )
    deed_fix_image = models.ImageField(
        upload_to="reports/fixes/deed/",
        null=True,
        blank=True,
        validators=[validate_image],
        verbose_name=_("تصویر ارائه سند"),
    )

    additional_notes = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات تکمیلی")
    )

    class Meta:
        verbose_name = _("گزارش بازرسی")
        verbose_name_plural = _("گزارش‌های بازرسی")
        ordering = ("-inspection_date",)

    def __str__(self) -> str:
        return _("گزارش %(code)s") % {"code": self.request.tracking_code}


class InspectionPhoto(models.Model):
    """Environmental photos captured by the expert during the inspection."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("شناسه"),
    )
    report = models.ForeignKey(
        InspectionReport,
        on_delete=models.CASCADE,
        related_name="photos",
        verbose_name=_("گزارش"),
    )
    photo = models.ImageField(
        upload_to="reports/photos/",
        validators=[validate_image],
        verbose_name=_("تصویر محیطی"),
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True, verbose_name=_("تاریخ بارگذاری")
    )

    class Meta:
        verbose_name = _("تصویر بازرسی")
        verbose_name_plural = _("تصاویر بازرسی")
        ordering = ("uploaded_at",)

    def __str__(self) -> str:
        return _("تصویر %(code)s") % {"code": self.report.request.tracking_code}
