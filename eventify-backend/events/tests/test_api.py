from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from events.models import Event, Payment, SupportTicket, Ticket, User


class EventifyApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            password="user-password",
            name="Regular User",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="admin-password",
            name="Admin User",
        )
        self.event = Event.objects.create(
            title="Test Event",
            description="A test event",
            date="2026-10-18",
            location="Nairobi",
            category="Music",
            ticket_price="1000.00",
            available_tickets=2,
        )

    def authenticate(self, email, password):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_signup_never_accepts_admin_role(self):
        response = self.client.post(
            reverse("signup"),
            {"name": "Attacker", "email": "attacker@example.com", "password": "safe-password", "role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(email="attacker@example.com").role, User.Role.USER)

    def test_public_event_list_and_admin_write_boundary(self):
        response = self.client.get(reverse("event-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["title"], "Test Event")

        self.authenticate("user@example.com", "user-password")
        response = self.client.post(reverse("event-list"), {"title": "Nope"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate("admin@example.com", "admin-password")
        response = self.client.post(
            reverse("event-list"),
            {
                "title": "New Event",
                "description": "Description",
                "date": "2026-12-01",
                "location": "Mombasa",
                "category": "Technology",
                "ticket_price": "1200.00",
                "available_tickets": 20,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_ticket_booking_returns_ticket_and_reduces_inventory(self):
        self.authenticate("user@example.com", "user-password")
        response = self.client.post(reverse("ticket-list"), {"event_id": self.event.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["event_title"], "Test Event")
        self.event.refresh_from_db()
        self.assertEqual(self.event.available_tickets, 1)

    @patch("events.views.initiate_stk_push")
    def test_payment_callback_marks_ticket_and_payment_paid(self, initiate):
        initiate.return_value = {
            "ResponseCode": "0",
            "MerchantRequestID": "merchant-1",
            "CheckoutRequestID": "checkout-1",
            "ResponseDescription": "Success",
        }
        self.authenticate("user@example.com", "user-password")
        ticket_response = self.client.post(reverse("ticket-list"), {"event_id": self.event.id}, format="json")
        ticket_id = ticket_response.data["id"]

        response = self.client.post(
            reverse("mpesa-stk-push"),
            {"ticket_id": ticket_id, "phone_number": "254712345678"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(ticket_id=ticket_id)
        self.assertEqual(payment.status, Payment.Status.INITIATED)

        response = self.client.post(
            reverse("mpesa-callback"),
            {
                "Body": {
                    "stkCallback": {
                        "MerchantRequestID": "merchant-1",
                        "CheckoutRequestID": "checkout-1",
                        "ResultCode": 0,
                        "ResultDesc": "Success",
                        "CallbackMetadata": {
                            "Item": [
                                {"Name": "Amount", "Value": 1000},
                                {"Name": "MpesaReceiptNumber", "Value": "TEST123"},
                                {"Name": "PhoneNumber", "Value": "254712345678"},
                            ]
                        },
                    }
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        payment.ticket.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.COMPLETED)
        self.assertEqual(payment.ticket.status, Ticket.Status.PAID)

    def test_support_ticket_is_persisted(self):
        response = self.client.post(
            reverse("support-ticket-list"),
            {"name": "Visitor", "email": "visitor@example.com", "issue": "I need help."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SupportTicket.objects.filter(email="visitor@example.com").exists())
