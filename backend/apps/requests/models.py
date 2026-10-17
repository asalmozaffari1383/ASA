"""The core intake model: an inspection request.

Per Part 2 §2 of the technical document. One row is created per applicant request,
whether it arrives through the public website or the Bale bot. It carries the
applicant's data, the current workflow ``status``, the three-state "system status"
answers (Yes / No / Unknown), and the uploaded attachments.
"""

import uuid

from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.utils import (
    TRACKING_CODE_LENGTH,
    generate_tracking_code,
)
from apps.common.validators import validate_document, validate_form_photo

# Iranian mobile numbers: 11 digits beginning with 09. Applied to both the CEO
# phone and the optional backup phone.
phone_validator = RegexValidator(
    regex=r"^09\d{9}$",
    message=_("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود."),
)


class InspectionRequest(models.Model):
    class Source(models.TextChoices):
        WEBSITE = "website", _("وب‌سایت")
        BALE = "bale", _("بله")

    class Status(models.TextChoices):
        PENDING_REVIEW = "pending_review", _("در انتظار بررسی")
        PENDING_PAYMENT = "pending_payment", _("در انتظار پرداخت")
        BALE_PHOTO_UPLOADED = "bale_photo_uploaded", _("تصویر فرم بله ثبت شد")
        SCHEDULED = "scheduled", _("زمان‌بندی‌شده")
        UNDER_REVIEW = "under_review", _("در حال بررسی")
        COMPLETED = "completed", _("تکمیل‌شده")

    class Ownership(models.TextChoices):
        MALKI = "malki", _("ملکی")
        ESTIJARI = "estijari", _("استیجاری")

    class InspectionType(models.TextChoices):
        INITIAL = "initial", _("اولیه")
        PERIODIC = "periodic", _("دوره‌ای")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("شناسه"),
    )
    tracking_code = models.CharField(
        max_length=TRACKING_CODE_LENGTH,
        unique=True,
        db_index=True,
        editable=False,
        verbose_name=_("کد رهگیری"),
    )
    source = models.CharField(
        max_length=10,
        choices=Source.choices,
        default=Source.WEBSITE,
        verbose_name=_("منبع ثبت"),
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
        verbose_name=_("وضعیت"),
    )

    # --- Applicant data ---------------------------------------------------
    company_name = models.CharField(max_length=255, verbose_name=_("نام شرکت/مجموعه"))
    ceo_name = models.CharField(max_length=255, verbose_name=_("نام مدیرعامل"))
    request_date = models.DateField(
        auto_now_add=True, verbose_name=_("تاریخ درخواست")
    )
    ceo_phone = models.CharField(
        max_length=11,
        db_index=True,
        validators=[phone_validator],
        verbose_name=_("شماره موبایل مدیرعامل"),
    )
    backup_phone = models.CharField(
        max_length=11,
        null=True,
        blank=True,
        validators=[phone_validator],
        verbose_name=_("شماره تماس پشتیبان"),
    )
    address = models.TextField(verbose_name=_("آدرس"))
    postal_code = models.CharField(
        max_length=10, null=True, blank=True, verbose_name=_("کد پستی")
    )
    activity_type = models.CharField(
        max_length=255, verbose_name=_("نوع فعالیت")
    )
    referrer_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name=_("نام معرف")
    )
    total_area_land = models.PositiveIntegerField(
        verbose_name=_("مساحت کل زمین (متر مربع)")
    )
    total_area_building = models.PositiveIntegerField(
        verbose_name=_("مساحت کل بنا (متر مربع)")
    )
    ownership_type = models.CharField(
        max_length=10,
        choices=Ownership.choices,
        verbose_name=_("نوع مالکیت"),
    )
    inspection_type = models.CharField(
        max_length=10,
        choices=InspectionType.choices,
        verbose_name=_("نوع بازرسی"),
    )

    # --- System statuses (nullable => "Unknown") --------------------------
    # ``null`` distinguishes the three states the wizard offers: True (Yes),
    # False (No) and None (Unknown / not answered).
    has_fire_extinguisher_system = models.BooleanField(
        null=True, blank=True, verbose_name=_("سیستم اطفاء حریق دارد؟")
    )
    fire_extinguisher_details = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات سیستم اطفاء حریق")
    )
    has_fire_alarm_system = models.BooleanField(
        null=True, blank=True, verbose_name=_("سیستم اعلام حریق دارد؟")
    )
    fire_alarm_details = models.TextField(
        null=True, blank=True, verbose_name=_("توضیحات سیستم اعلام حریق")
    )
    has_earthing_system = models.BooleanField(
        null=True, blank=True, verbose_name=_("سیستم ارتینگ دارد؟")
    )
    earthing_year = models.CharField(
        max_length=4, null=True, blank=True, verbose_name=_("سال اجرای ارتینگ")
    )

    # --- Attachments ------------------------------------------------------
    deed_file = models.FileField(
        upload_to="requests/deeds/",
        null=True,
        blank=True,
        validators=[validate_document],
        verbose_name=_("فایل سند مالکیت"),
    )
    lease_file = models.FileField(
        upload_to="requests/leases/",
        null=True,
        blank=True,
        validators=[validate_document],
        verbose_name=_("فایل اجاره‌نامه"),
    )
    bale_form_photo = models.ImageField(
        upload_to="requests/bale_forms/",
        null=True,
        blank=True,
        validators=[validate_form_photo],
        verbose_name=_("تصویر فرم دستی بله"),
    )
    postal_code_document = models.FileField(
        upload_to="requests/postal_codes/",
        null=True,
        blank=True,
        validators=[validate_document],
        verbose_name=_("سند تأیید کد پستی"),
    )

    class Meta:
        verbose_name = _("درخواست بازرسی")
        verbose_name_plural = _("درخواست‌های بازرسی")
        ordering = ("-request_date", "-id")
        indexes = [
            models.Index(fields=["status", "source"]),
        ]

    def __str__(self) -> str:
        return f"{self.tracking_code} — {self.company_name}"

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            self.tracking_code = self._generate_unique_tracking_code()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_unique_tracking_code(cls, max_attempts: int = 10) -> str:
        """Generate a tracking code not already present in the table.

        The unique DB index is the real guard against collisions; this loop just
        avoids a near-certain success path raising an IntegrityError. On the
        astronomically unlikely event of exhausting attempts, we surface an error
        rather than silently retrying forever.
        """
        for _attempt in range(max_attempts):
            code = generate_tracking_code()
            if not cls.objects.filter(tracking_code=code).exists():
                return code
        raise RuntimeError("Unable to generate a unique tracking code.")
