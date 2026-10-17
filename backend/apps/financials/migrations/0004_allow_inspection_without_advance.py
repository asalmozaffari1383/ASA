from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0003_systemconfiguration'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemconfiguration',
            name='allow_inspection_without_advance',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'در صورت فعال بودن، رسید پیش‌پرداخت در فرم وب‌سایت اختیاری می‌شود و '
                    'ادمین می‌تواند بازرسی را بدون تأیید پیش‌پرداخت زمان‌بندی کند.'
                ),
                verbose_name='امکان بازرسی بدون پیش‌پرداخت',
            ),
        ),
    ]
