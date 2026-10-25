from django.db import models
from django.core.exceptions import ValidationError

from apps.common.validators import validate_image
from .page_defaults import default_page_content


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


def default_contact_links():
    return [{'kind': 'instagram', 'label': 'اینستاگرام', 'text': '@imensazanararat', 'href': 'https://www.instagram.com/imensazanararat/'}, {'kind': 'web', 'label': 'وب\u200cسایت', 'text': 'www.asaeng.org', 'href': 'https://asaeng.org'}, {'kind': 'mail', 'label': 'ایمیل', 'text': 'info@asaeng.org', 'href': 'mailto:info@asaeng.org'}, {'kind': 'phone', 'label': 'تماس مستقیم', 'text': '09141651365', 'href': 'tel:+989141651365'}, {'kind': 'phone', 'label': 'شماره همراه، واتساپ و بله', 'text': '09002652365', 'href': 'tel:+989002652365'}, {'kind': 'map', 'label': 'نشانی', 'text': 'منطقه آزاد ماکو، روبه\u200cروی شهرداری', 'href': 'https://www.google.com/maps/search/?api=1&query=ماکو+شهرداری'}, {'kind': 'chat', 'label': 'پیام\u200cرسان بله', 'text': 'ثبت درخواست در بات آسا', 'href': 'https://ble.ir/AsaengBot'}]

def default_contact_services():
    return ['اعلام و اطفا حریق', 'ظروف تحت فشار', 'ایمنی برق']

class ContactSettings(models.Model):
    title = models.CharField("عنوان پنجره", max_length=100, default="تماس با آسا")
    subtitle = models.CharField("نام شرکت", max_length=200, default="مهندسین مشاور ایمنی آسا", blank=True)
    services_title = models.CharField("عنوان خدمات", max_length=200, default="ارزیابی و صدور گواهی ایمنی", blank=True)
    services = models.JSONField("خدمات", default=default_contact_services, blank=True)
    links = models.JSONField("راه‌های ارتباطی", default=default_contact_links, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]

    class Meta:
        verbose_name = "تماس با ما"
        verbose_name_plural = "تماس با ما"


class PageContent(models.Model):
    content = models.JSONField(default=default_page_content)
    hero_image = models.ImageField(upload_to="website/pages/", blank=True, null=True, validators=[validate_image])
    about_image = models.ImageField(upload_to="website/pages/", blank=True, null=True, validators=[validate_image])
    cta_image = models.ImageField(upload_to="website/pages/", blank=True, null=True, validators=[validate_image])
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]
