import apps.common.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="ServiceCard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160, verbose_name="عنوان")),
                ("description", models.TextField(max_length=1200, verbose_name="توضیحات")),
                ("specs", models.JSONField(blank=True, default=list, verbose_name="ویژگی‌ها")),
                ("image", models.ImageField(blank=True, null=True, upload_to="website/services/", validators=[apps.common.validators.validate_image], verbose_name="تصویر")),
                ("image_alt", models.CharField(blank=True, max_length=200, verbose_name="توضیح تصویر")),
                ("default_image", models.CharField(blank=True, choices=[("/images/service-boiler.jpg", "ظروف تحت فشار"), ("/images/service-electrical.jpg", "ایمنی برق"), ("/images/service-fire.jpg", "ایمنی حریق")], max_length=80, verbose_name="تصویر پیش‌فرض")),
                ("position", models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")),
                ("is_active", models.BooleanField(default=True, verbose_name="نمایش در سایت")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="آخرین ویرایش")),
            ],
            options={"verbose_name": "کارت خدمات", "verbose_name_plural": "کارت‌های خدمات", "ordering": ["position", "id"]},
        ),
    ]
