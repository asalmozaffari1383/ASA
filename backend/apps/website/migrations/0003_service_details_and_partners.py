from django.db import migrations, models

import apps.common.validators


class Migration(migrations.Migration):
    dependencies = [("website", "0002_seed_services")]

    operations = [
        migrations.AddField(
            model_name="servicecard", name="details",
            field=models.TextField(blank=True, max_length=20000, verbose_name="شرح کامل خدمت"),
        ),
        migrations.AddField(
            model_name="servicecard", name="applications",
            field=models.TextField(blank=True, max_length=5000, verbose_name="دامنه و کاربردها"),
        ),
        migrations.AddField(
            model_name="servicecard", name="inspection_steps",
            field=models.TextField(blank=True, max_length=5000, verbose_name="مراحل انجام خدمت"),
        ),
        migrations.CreateModel(
            name="CompanyPartner",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160, verbose_name="نام شرکت")),
                ("logo", models.ImageField(upload_to="website/partners/", validators=[apps.common.validators.validate_image], verbose_name="لوگو")),
                ("position", models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")),
                ("is_active", models.BooleanField(default=True, verbose_name="نمایش در سایت")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="آخرین ویرایش")),
            ],
            options={
                "verbose_name": "شرکت همکار", "verbose_name_plural": "لوگوی شرکت‌های همکار",
                "ordering": ["position", "id"],
            },
        ),
    ]
