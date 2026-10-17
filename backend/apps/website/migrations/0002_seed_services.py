from django.db import migrations


def seed_services(apps, schema_editor):
    service_model = apps.get_model("website", "ServiceCard")
    entries = [
        (
            "ارزیابی ایمنی ظروف تحت فشار",
            "بازرسی فنی دیگ‌های بخار و مخازن، ضخامت‌سنجی و آزمون‌های تخصصی برای اطمینان از عملکرد ایمن تجهیزات.",
            ["ضخامت‌سنجی اولتراسونیک", "تست هیدرواستاتیک", "دیگ بخار و آبگرم"],
            "/images/service-boiler.jpg",
        ),
        (
            "ارزیابی ایمنی برق",
            "ارزیابی تأسیسات الکتریکی، اندازه‌گیری مقاومت سیستم اتصال به زمین و شناسایی خطرات برق در محیط کار.",
            ["تست ارتینگ", "تأسیسات الکتریکی", "بازرسی ادواری"],
            "/images/service-electrical.jpg",
        ),
        (
            "اعلام و اطفاء حریق",
            "ارزیابی، طراحی و مشاوره برای سیستم‌های اعلام و اطفاء حریق؛ از شناسایی خطر تا انتخاب راهکار مناسب.",
            ["سیستم اعلام حریق", "سیستم اطفاء", "طراحی و اجرا"],
            "/images/service-fire.jpg",
        ),
    ]
    for position, (title, description, specs, default_image) in enumerate(entries, 1):
        service_model.objects.using(schema_editor.connection.alias).create(
            title=title, description=description, specs=specs,
            default_image=default_image, image_alt=title, position=position,
        )


class Migration(migrations.Migration):
    dependencies = [("website", "0001_initial")]
    operations = [migrations.RunPython(seed_services, migrations.RunPython.noop)]
