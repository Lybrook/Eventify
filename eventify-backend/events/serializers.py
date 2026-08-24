from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Event, Payment, SupportTicket, Ticket

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "created_at"]
        read_only_fields = ["id", "role", "created_at"]


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["name", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(role=User.Role.USER, **validated_data)


class EventSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    available_tickets = serializers.IntegerField(min_value=0)
    ticket_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "date",
            "location",
            "ticket_price",
            "available_tickets",
            "featured",
            "category",
            "image_url",
            "image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "image_url", "created_at", "updated_at"]

    def get_image_url(self, obj):
        return obj.public_image_url

    def validate(self, attrs):
        if not attrs.get("title", getattr(self.instance, "title", "")):
            raise serializers.ValidationError({"title": "Title is required."})
        return attrs


class TicketSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_date = serializers.DateField(source="event.date", read_only=True)
    event_location = serializers.CharField(source="event.location", read_only=True)
    ticket_price = serializers.DecimalField(source="event.ticket_price", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "event",
            "event_title",
            "event_date",
            "event_location",
            "ticket_price",
            "user",
            "purchase_date",
            "status",
            "inventory_released",
        ]
        read_only_fields = [
            "id",
            "event_title",
            "event_date",
            "event_location",
            "ticket_price",
            "user",
            "purchase_date",
            "status",
            "inventory_released",
        ]

    def validate_event(self, event):
        if event.available_tickets < 1:
            raise serializers.ValidationError("No tickets available for this event.")
        return event


class PaymentSerializer(serializers.ModelSerializer):
    ticket_id = serializers.IntegerField(source="ticket.id", read_only=True)
    event_title = serializers.CharField(source="ticket.event.title", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "transaction_id",
            "ticket_id",
            "event_title",
            "amount",
            "phone_number",
            "status",
            "checkout_request_id",
            "merchant_request_id",
            "mpesa_receipt_number",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [field for field in fields if field != "phone_number"]


class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ["id", "name", "email", "issue", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]
