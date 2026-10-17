import apps.common.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('requests', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inspectionrequest',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending_review', 'در انتظار بررسی'),
                    ('pending_payment', 'در انتظار پرداخت'),
                    ('bale_photo_uploaded', 'تصویر فرم بله ثبت شد'),
                    ('scheduled', 'زمان‌بندی‌شده'),
                    ('under_review', 'در حال بررسی'),
                    ('completed', 'تکمیل‌شده'),
                ],
                db_index=True,
                default='pending_payment',
                max_length=20,
                verbose_name='وضعیت',
            ),
        ),
        migrations.AddField(
            model_name='inspectionrequest',
            name='postal_code_document',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='requests/postal_codes/',
                validators=[apps.common.validators.FileValidator(('application/pdf', 'image/jpeg', 'image/png'), 10485760)],
                verbose_name='سند تأیید کد پستی',
            ),
        ),
    ]
