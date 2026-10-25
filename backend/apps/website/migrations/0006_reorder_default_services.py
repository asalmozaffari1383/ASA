from django.db import migrations


def swap_default_services(apps, schema_editor):
    Service = apps.get_model("website", "ServiceCard")
    database = schema_editor.connection.alias
    pressure = Service.objects.using(database).filter(default_image="/images/service-boiler.jpg").order_by("position", "id").first()
    fire = Service.objects.using(database).filter(default_image="/images/service-fire.jpg").order_by("position", "id").first()
    if pressure and fire and pressure.position < fire.position:
        Service.objects.using(database).filter(pk=pressure.pk).update(position=fire.position)
        Service.objects.using(database).filter(pk=fire.pk).update(position=pressure.position)


class Migration(migrations.Migration):
    dependencies = [("website", "0005_contactsettings")]
    operations = [migrations.RunPython(swap_default_services, migrations.RunPython.noop)]
