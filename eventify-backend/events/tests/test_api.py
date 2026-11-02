from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from events.models import Event, Payment, SupportTicket, Ticket, User
from events.services import MpesaError


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
        self.organizer = User.objects.create_user(
            email="organizer@example.com",
            password="organizer-password",
            name="Event Organizer",
            role=User.Role.ORGANIZER,
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

    def test_signup_never_accepts_privileged_role(self):
        for role in (User.Role.ORGANIZER, User.Role.ADMIN):
            with self.subTest(role=role):
                email = f"attacker-{role}@example.com"
                response = self.client.post(
                    reverse("signup"),
                    {
                        "name": "Attacker",
                        "email": email,
                        "password": "safe-password",
                        "role": role,
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(User.objects.get(email=email).role, User.Role.USER)

    def test_event_organizer_can_create_update_and_delete_events(self):
        self.authenticate("organizer@example.com", "organizer-password")
        response = self.client.post(
            reverse("event-list"),
            {
                "title": "Organizer Event",
                "description": "Created by an event organizer",
                "date": "2026-12-01",
                "location": "Mombasa",
                "category": "Technology",
                "ticket_price": "1200.00",
                "available_tickets": 20,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event_id = response.data["id"]

        response = self.client.patch(
            reverse("event-detail", args=[event_id]),
            {"title": "Updated Organizer Event"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Organizer Event")

        response = self.client.delete(reverse("event-detail", args=[event_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_event_organizer_does_not_get_admin_access(self):
        self.authenticate("organizer@example.com", "organizer-password")

        response = self.client.get(reverse("user-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_signup_rejects_common_passwords(self):
        response = self.client.post(
            reverse("signup"),
            {"name": "New User", "email": "new@example.com", "password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="new@example.com").exists())

    def test_change_password_applies_configured_password_validators(self):
        self.authenticate("user@example.com", "user-password")

        response = self.client.post(
            reverse("change-password"),
            {"current_password": "user-password", "new_password": "12345678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("user-password"))

    def test_account_with_payment_history_is_anonymized_on_deletion(self):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PAID)
        payment = Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.COMPLETED,
            raw_response={"phone": "254712345678"},
        )
        self.authenticate("user@example.com", "user-password")

        response = self.client.delete(
            reverse("user-detail"),
            {"password": "user-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        ticket.refresh_from_db()
        payment.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.user.name, "Deleted user")
        self.assertNotEqual(self.user.email, "user@example.com")
        self.assertEqual(ticket.status, Ticket.Status.PAID)
        self.assertEqual(payment.phone_number, "")
        self.assertEqual(payment.raw_response, {})

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

    def test_event_rejects_fractional_kenyan_shilling_prices(self):
        self.authenticate("admin@example.com", "admin-password")

        response = self.client.post(
            reverse("event-list"),
            {
                "title": "Fractional Price Event",
                "date": "2026-12-01",
                "location": "Nairobi",
                "category": "Music",
                "ticket_price": "1000.50",
                "available_tickets": 10,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ticket_price", response.data)

    def test_free_ticket_booking_does_not_start_a_payment(self):
        event = Event.objects.create(
            title="Free Community Meetup",
            date="2026-12-01",
            location="Nairobi",
            category="Community",
            ticket_price="0.00",
            available_tickets=1,
        )
        self.authenticate("user@example.com", "user-password")

        response = self.client.post(
            reverse("ticket-list"),
            {"event_id": event.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Ticket.Status.PAID)
        self.assertFalse(Payment.objects.filter(ticket_id=response.data["id"]).exists())
        event.refresh_from_db()
        self.assertEqual(event.available_tickets, 0)

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

    @patch("events.views.initiate_stk_push")
    def test_stk_push_normalizes_local_kenyan_phone_numbers(self, initiate):
        initiate.return_value = {
            "ResponseCode": "0",
            "MerchantRequestID": "merchant-phone",
            "CheckoutRequestID": "checkout-phone",
        }
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        self.authenticate("user@example.com", "user-password")

        response = self.client.post(
            reverse("mpesa-stk-push"),
            {"ticket_id": ticket.id, "phone_number": "0712 345 678"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = Payment.objects.get(ticket=ticket)
        self.assertEqual(payment.phone_number, "254712345678")
        self.assertEqual(initiate.call_args.args[0].phone_number, "254712345678")

    def test_stk_push_rejects_invalid_phone_numbers(self):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        self.authenticate("user@example.com", "user-password")

        response = self.client.post(
            reverse("mpesa-stk-push"),
            {"ticket_id": ticket.id, "phone_number": "not a phone"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Payment.objects.filter(ticket=ticket).exists())

    @patch("events.views.query_stk_push")
    def test_failed_payment_callback_cannot_be_reversed_by_late_success(self, query):
        query.return_value = {
            "ResponseCode": "0",
            "ResultCode": 1,
            "CheckoutRequestID": "checkout-terminal",
            "MerchantRequestID": "merchant-terminal",
        }
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
    @patch("events.views.query_stk_push")
    def test_payment_callback_marks_ticket_and_payment_paid(self, query, initiate):
        initiate.return_value = {
            "ResponseCode": "0",
            "MerchantRequestID": "merchant-1",
            "CheckoutRequestID": "checkout-1",
            "ResponseDescription": "Success",
        }
        query.return_value = {
            "ResponseCode": "0",
            "ResultCode": 0,
            "CheckoutRequestID": "checkout-1",
            "MerchantRequestID": "merchant-1",
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

    @patch("events.views.query_stk_push")
    def test_success_callback_is_not_trusted_without_provider_confirmation(self, query):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        payment = Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.INITIATED,
            checkout_request_id="checkout-forged",
            merchant_request_id="merchant-forged",
        )
        query.return_value = {
            "ResponseCode": "0",
            "ResultCode": 1032,
            "CheckoutRequestID": payment.checkout_request_id,
            "MerchantRequestID": payment.merchant_request_id,
        }

        response = self.client.post(
            reverse("mpesa-callback"),
            {
                "Body": {
                    "stkCallback": {
                        "MerchantRequestID": payment.merchant_request_id,
                        "CheckoutRequestID": payment.checkout_request_id,
                        "ResultCode": 0,
                        "ResultDesc": "Success",
                    }
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        ticket.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.assertEqual(ticket.status, Ticket.Status.FAILED)

    @patch("events.views.query_stk_push")
    def test_unverifiable_callback_leaves_payment_pending(self, query):
        ticket = Ticket.objects.create(event=self.event, user=self.user, status=Ticket.Status.PENDING)
        payment = Payment.objects.create(
            ticket=ticket,
            user=self.user,
            amount="1000.00",
            phone_number="254712345678",
            status=Payment.Status.INITIATED,
            checkout_request_id="checkout-unverified",
            merchant_request_id="merchant-unverified",
        )
        query.side_effect = MpesaError("Daraja unavailable")

        response = self.client.post(
            reverse("mpesa-callback"),
            {
                "Body": {
                    "stkCallback": {
                        "MerchantRequestID": payment.merchant_request_id,
                        "CheckoutRequestID": payment.checkout_request_id,
                        "ResultCode": 0,
                    }
                }
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        payment.refresh_from_db()
        ticket.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.INITIATED)
        self.assertEqual(ticket.status, Ticket.Status.PENDING)

    def test_support_ticket_is_persisted(self):
        response = self.client.post(
            reverse("support-ticket-list"),
            {"name": "Visitor", "email": "visitor@example.com", "issue": "I need help."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SupportTicket.objects.filter(email="visitor@example.com").exists())
