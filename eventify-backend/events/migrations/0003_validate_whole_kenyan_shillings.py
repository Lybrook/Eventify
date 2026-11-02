import django.core.validators
import django.db.models
import events.models
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0002_clear_seeded_external_event_images"),
    ]

    operations = [
        migrations.AlterField(
            model_name="event",
            name="ticket_price",
            field=django.db.models.DecimalField(
                decimal_places=2,
                max_digits=10,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    events.models.validate_whole_kenyan_shillings,
                ],
            ),
        ),
        migrations.AlterField(
            model_name="payment",
            name="amount",
            field=django.db.models.DecimalField(
                decimal_places=2,
                max_digits=10,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    events.models.validate_whole_kenyan_shillings,
                ],
            ),
        ),
    ]
