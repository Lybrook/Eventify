from datetime import date

from django.core.management.base import BaseCommand
from django.utils.crypto import get_random_string

from events.models import Event, User


EVENTS = [
    {
        "title": "Music Concert",
        "description": "A great music concert featuring top Kenyan artists.",
        "date": date(2026, 10, 18),
        "location": "KICC, Nairobi",
        "category": "Music",
        "featured": True,
        "ticket_price": 2500,
        "available_tickets": 50,
    },
    {
        "title": "East Africa Tech Forum",
        "description": "A technology forum exploring AI, blockchain, and cloud computing.",
        "date": date(2026, 11, 7),
        "location": "Sarit Centre, Nairobi",
        "category": "Technology",
        "featured": False,
        "ticket_price": 3000,
        "available_tickets": 50,
    },
    {
        "title": "Food & Wine Festival",
        "description": "Experience the best of Kenyan cuisine and international wines.",
        "date": date(2026, 11, 21),
        "location": "Carnivore Gardens, Nairobi",
        "category": "Food & Drinks",
        "featured": True,
        "ticket_price": 4000,
        "available_tickets": 50,
    },
    {
        "title": "Contemporary Africa",
        "description": "A showcase of contemporary African art from emerging artists.",
        "date": date(2026, 12, 5),
        "location": "National Museums of Kenya, Nairobi",
        "category": "Art & Culture",
        "featured": False,
        "ticket_price": 1500,
        "available_tickets": 50,
    },
    {
        "title": "Run for Education",
        "description": "An annual charity run supporting education initiatives in Kenya.",
        "date": date(2027, 1, 17),
        "location": "Ngong Road, Nairobi",
        "category": "Sports",
        "featured": True,
        "ticket_price": 2000,
        "available_tickets": 50,
    },
    {
        "title": "East Africa Business Summit",
        "description": "Connecting entrepreneurs and investors across East Africa.",
        "date": date(2027, 2, 12),
        "location": "Radisson Blu, Nairobi",
        "category": "Business",
        "featured": False,
        "ticket_price": 5000,
        "available_tickets": 50,
    },
]


class Command(BaseCommand):
    help = "Seed Eventify demo data with supplied or securely generated demo-account passwords."

    def add_arguments(self, parser):
        parser.add_argument("--admin-email", default="admin@example.com")
        parser.add_argument("--admin-password", default=None)
        parser.add_argument("--user-email", default="user@example.com")
        parser.add_argument("--user-password", default=None)

    def handle(self, *args, **options):
        admin_password = options["admin_password"] or get_random_string(32)
        user_password = options["user_password"] or get_random_string(32)

        admin, _ = User.objects.update_or_create(
            email=options["admin_email"],
            defaults={"name": "Eventify Admin", "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin.set_password(admin_password)
        admin.save()

        user, _ = User.objects.update_or_create(
            email=options["user_email"],
            defaults={"name": "Eventify User", "role": User.Role.USER, "is_staff": False, "is_superuser": False},
        )
        user.set_password(user_password)
        user.save()

        for event_data in EVENTS:
            Event.objects.update_or_create(
                title=event_data["title"],
                defaults={**event_data, "image_url": ""},
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(EVENTS)} events and demo accounts."))
        if not options["admin_password"]:
            self.stdout.write(f"Generated admin password: {admin_password}")
        if not options["user_password"]:
            self.stdout.write(f"Generated user password: {user_password}")
