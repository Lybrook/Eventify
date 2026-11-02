from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0003_validate_whole_kenyan_shillings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("user", "User"),
                    ("organizer", "Event organizer"),
                    ("admin", "Admin"),
                ],
                default="user",
                max_length=20,
            ),
        ),
    ]
