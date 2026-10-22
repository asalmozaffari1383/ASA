import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("financials", "0004_allow_inspection_without_advance"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(model_name="systemconfiguration", name="ceo_account_number", field=models.CharField(blank=True, default="", max_length=30)),
        migrations.AddField(model_name="systemconfiguration", name="ceo_iban", field=models.CharField(blank=True, default="", max_length=26)),
        migrations.AddField(model_name="systemconfiguration", name="ceo_account_holder", field=models.CharField(blank=True, default="", max_length=120)),
        migrations.CreateModel(
            name="ConfigurationChange",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("actor_username", models.CharField(max_length=150)),
                ("action", models.CharField(choices=[("updated", "تغییر تنظیمات بات"), ("password_failed", "تأیید رمز ناموفق")], max_length=30)),
                ("before", models.JSONField(default=dict)),
                ("after", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
