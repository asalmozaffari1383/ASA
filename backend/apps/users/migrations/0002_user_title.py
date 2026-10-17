from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='title',
            field=models.CharField(
                blank=True,
                default='',
                help_text='سمت یا عنوان شغلی کاربر (مثلاً «کارشناس ارشد ایمنی»).',
                max_length=120,
                verbose_name='سمت',
            ),
        ),
    ]
