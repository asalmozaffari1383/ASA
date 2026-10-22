from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("requests", "0002_pending_review_and_postal_doc")]

    operations = [
        migrations.AddField(model_name="inspectionrequest", name="certificate_description", field=models.TextField(blank=True, verbose_name="متن توضیحات گواهی")),
        migrations.AddField(model_name="inspectionrequest", name="certificate_number", field=models.CharField(blank=True, max_length=80, verbose_name="شماره گواهی")),
        migrations.AddField(model_name="inspectionrequest", name="certificate_usage_type", field=models.CharField(blank=True, max_length=255, verbose_name="نوع تصرف")),
        migrations.AddField(model_name="inspectionrequest", name="certificate_attachment", field=models.CharField(blank=True, max_length=255, verbose_name="پیوست گواهی")),
        migrations.AddField(model_name="inspectionrequest", name="certificate_issued_at", field=models.DateTimeField(blank=True, null=True, verbose_name="زمان صدور گواهی")),
    ]
