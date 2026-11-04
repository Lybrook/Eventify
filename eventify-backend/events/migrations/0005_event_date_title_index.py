from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("events", "0004_add_event_organizer_role"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["date", "title"], name="evt_date_title_idx"),
        ),
    ]
