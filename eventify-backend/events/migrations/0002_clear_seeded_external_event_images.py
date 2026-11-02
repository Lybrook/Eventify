from django.db import migrations


def clear_seeded_external_images(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    Event.objects.filter(image_url__icontains="images.unsplash.com").update(image_url="")


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(clear_seeded_external_images, migrations.RunPython.noop),
    ]
