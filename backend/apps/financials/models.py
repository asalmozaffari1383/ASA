"""Financial records: the two-stage receipt-based payment workflow.

Per Part 2 §3 of the technical document. Each request has up to two payments — a
stage-1 down payment and a stage-2 final settlement. Applicants upload a bank
receipt image; a user with ``can_manage_financial`` approves it. ``amount_charged``
is captured from the dynamic system settings at creation time (Step 5) so that a
later change to the configured amount does not retroactively alter past records.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import validate_receipt_image


class FinancialRecord(models.Model):
    class Stage(models.TextChoices):
        STAGE_1 = "stage_1", _("پیش‌پرداخت")
        STAGE_2 = "stage_2", _("تسویه نهایی")

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("شناسه"),
    )
    request = models.ForeignKey(
        "requests.InspectionRequest",
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name=_("درخواست"),
    )
    stage = models.CharField(
        max_length=10,
        choices=Stage.choices,
        verbose_name=_("مرحله پرداخت"),
    )
    amount_charged = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        verbose_name=_("مبلغ (ریال)"),
        help_text=_("به‌صورت پویا از تنظیمات سیستم خوانده می‌شود."),
    )
    receipt_image = models.ImageField(
        upload_to="financials/receipts/",
        validators=[validate_receipt_image],
        verbose_name=_("تصویر رسید پرداخت"),
    )
    is_approved = models.BooleanField(
        default=False, verbose_name=_("تأیید شده؟")
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payments",
        verbose_name=_("تأییدکننده"),
    )
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name=_("تاریخ ثبت")
    )

    class Meta:
        verbose_name = _("سابقه مالی")
        verbose_name_plural = _("سوابق مالی")
        ordering = ("-created_at",)
        constraints = [
            # A request has at most one payment per stage.
            models.UniqueConstraint(
                fields=["request", "stage"],
                name="unique_payment_per_request_stage",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.request.tracking_code} — {self.get_stage_display()}"


class SystemConfiguration(models.Model):
    """Singleton holding CEO-editable, system-wide settings.

    The payment amounts are read at FinancialRecord creation time (Part 2 §3 —
    "Dynamically fetched from settings") and the card number is served to the Bale
    bot. Enforced as a singleton via a fixed primary key so there is exactly one row.
    """

    SINGLETON_PK = 1

    stage_1_amount = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        verbose_name=_("مبلغ پیش‌پرداخت (ریال)"),
    )
    stage_2_amount = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        verbose_name=_("مبلغ تسویه نهایی (ریال)"),
    )
    ceo_card_number = models.CharField(
        max_length=32,
        blank=True,
        verbose_name=_("شماره کارت مدیرعامل"),
        help_text=_("برای ارسال به کاربر در ربات بله."),
    )
    allow_inspection_without_advance = models.BooleanField(
        default=False,
        verbose_name=_("امکان بازرسی بدون پیش‌پرداخت"),
        help_text=_(
            "در صورت فعال بودن، رسید پیش‌پرداخت در فرم وب‌سایت اختیاری می‌شود و "
            "ادمین می‌تواند بازرسی را بدون تأیید پیش‌پرداخت زمان‌بندی کند."
        ),
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("آخرین به‌روزرسانی"))

    class Meta:
        verbose_name = _("تنظیمات سیستم")
        verbose_name_plural = _("تنظیمات سیستم")

    def __str__(self) -> str:
        return "تنظیمات سیستم"

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_PK
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SystemConfiguration":
        """Return the singleton, creating it with defaults on first access."""
        obj, _ = cls.objects.get_or_create(pk=cls.SINGLETON_PK)
        return obj
