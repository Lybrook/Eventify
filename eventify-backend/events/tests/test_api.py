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

    def test_ticket_cannot_be_cancelled_while_payment_is_active(self):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.INITIATED,
            checkout_request_id="checkout-active",
        )
        self.authenticate("user@example.com", "user-password")

        response = self.client.delete(reverse("ticket-detail", args=[ticket.id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.PENDING)
        self.assertFalse(ticket.inventory_released)

    @patch("events.views.initiate_stk_push")
    def test_retry_does_not_duplicate_an_inflight_payment_request(self, initiate):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.PENDING,
        )
        self.authenticate("user@example.com", "user-password")

        response = self.client.post(
            reverse("mpesa-stk-push"),
            {"ticket_id": ticket.id, "phone_number": "254712345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initiate.assert_not_called()

    def test_failed_payment_callback_cannot_be_reversed_by_late_success(self):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        payment = Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.INITIATED,
            checkout_request_id="checkout-terminal",
            merchant_request_id="merchant-terminal",
        )
        self.event.available_tickets = 1
        self.event.save(update_fields=["available_tickets"])

        failed_callback = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "merchant-terminal",
                    "CheckoutRequestID": "checkout-terminal",
                    "ResultCode": 1,
                    "ResultDesc": "Payment cancelled",
                }
            }
        }
        self.client.post(reverse("mpesa-callback"), failed_callback, format="json")
        self.client.post(
            reverse("mpesa-callback"),
            {
                "Body": {
                    "stkCallback": {
                        "MerchantRequestID": "merchant-terminal",
                        "CheckoutRequestID": "checkout-terminal",
                        "ResultCode": 0,
                        "ResultDesc": "Success",
                    }
                }
            },
            format="json",
        )

        payment.refresh_from_db()
        ticket.refresh_from_db()
        self.event.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(ticket.status, Ticket.Status.FAILED)
        self.assertTrue(ticket.inventory_released)
        self.assertEqual(self.event.available_tickets, 2)

    def test_malformed_payment_callback_is_rejected(self):
        response = self.client.post(reverse("mpesa-callback"), {"Body": []}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
        retry_response = self.client.post(
            reverse("mpesa-stk-push"),
            {"ticket_id": ticket_id, "phone_number": "254712345678"},
            format="json",
        )
        self.assertEqual(retry_response.status_code, status.HTTP_200_OK)
        initiate.assert_called_once()
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
