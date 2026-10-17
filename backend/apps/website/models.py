from django.db import models
from django.core.exceptions import ValidationError

from apps.common.validators import validate_image


class ServiceCard(models.Model):
    title = models.CharField("عنوان", max_length=160)
    description = models.TextField("توضیحات", max_length=1200)
    details = models.TextField("شرح کامل خدمت", max_length=20000, blank=True)
    applications = models.TextField("دامنه و کاربردها", max_length=5000, blank=True)
    inspection_steps = models.TextField("مراحل انجام خدمت", max_length=5000, blank=True)
    specs = models.JSONField("ویژگی‌ها", default=list, blank=True)
    image = models.ImageField(
        "تصویر", upload_to="website/services/", blank=True, null=True,
        validators=[validate_image],
    )
    image_alt = models.CharField("توضیح تصویر", max_length=200, blank=True)
    default_image = models.CharField(
        "تصویر پیش‌فرض", max_length=80, blank=True,
        choices=[
            ("/images/service-boiler.jpg", "ظروف تحت فشار"),
            ("/images/service-electrical.jpg", "ایمنی برق"),
            ("/images/service-fire.jpg", "ایمنی حریق"),
        ],
    )
    position = models.PositiveIntegerField("ترتیب نمایش", default=0)
    is_active = models.BooleanField("نمایش در سایت", default=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "کارت خدمات"
        verbose_name_plural = "کارت‌های خدمات"

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if not isinstance(self.specs, list) or len(self.specs) > 8:
            raise ValidationError({"specs": "ویژگی‌ها باید فهرستی با حداکثر ۸ متن باشد."})
        if any(not isinstance(item, str) or not item.strip() or len(item) > 100 for item in self.specs):
            raise ValidationError({"specs": "هر ویژگی باید متن غیرخالی و حداکثر ۱۰۰ کاراکتر باشد."})


class CompanyPartner(models.Model):
    name = models.CharField("نام شرکت", max_length=160)
    logo = models.ImageField(
        "لوگو", upload_to="website/partners/", validators=[validate_image],
    )
    position = models.PositiveIntegerField("ترتیب نمایش", default=0)
    is_active = models.BooleanField("نمایش در سایت", default=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    class Meta:
        ordering = ["position", "id"]
        verbose_name = "شرکت همکار"
        verbose_name_plural = "لوگوی شرکت‌های همکار"

    def __str__(self):
        return self.name
