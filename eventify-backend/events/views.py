import logging
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Event, Payment, SupportTicket, Ticket
from .permissions import IsAdminRole
from .serializers import (
    EventSerializer,
    PaymentSerializer,
    SignupSerializer,
    SupportTicketSerializer,
    TicketSerializer,
    UserSerializer,
)
from .services import MpesaError, initiate_stk_push, release_ticket_inventory

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "eventify-api"})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def user_detail(request):
    if request.method == "GET":
        return Response(UserSerializer(request.user).data)
    if request.method == "DELETE":
        if not request.user.check_password(request.data.get("password", "")):
            return Response({"detail": "A valid password is required to delete the account."}, status=400)
        request.user.delete()
        return Response(status=204)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")
    if not current_password or not new_password:
        return Response({"detail": "current_password and new_password are required."}, status=400)
    if not request.user.check_password(current_password):
        return Response({"detail": "Current password is incorrect."}, status=401)
    if len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters."}, status=400)
    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    return Response({"message": "Password changed successfully."})


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [AllowAny()]
        return [IsAdminRole()]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        location = self.request.query_params.get("location")
        featured = self.request.query_params.get("featured")
        if search:
            queryset = queryset.filter(title__icontains=search)
        if category:
            queryset = queryset.filter(category__iexact=category)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if featured in {"true", "false"}:
            queryset = queryset.filter(featured=featured == "true")
        return queryset


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related("event", "user").all()
    serializer_class = TicketSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        event_id = request.data.get("event") or request.data.get("event_id")
        if not event_id:
            return Response({"detail": "event is required."}, status=400)
        with transaction.atomic():
            event = Event.objects.select_for_update().filter(pk=event_id).first()
            if event is None:
                return Response({"detail": "Event not found."}, status=404)
            if event.available_tickets < 1:
                return Response({"detail": "No tickets available for this event."}, status=400)
            ticket = Ticket.objects.create(
                event=event,
                user=request.user,
                status=Ticket.Status.CONFIRMED,
            )
            event.available_tickets -= 1
            event.save(update_fields=["available_tickets", "updated_at"])
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        ticket = get_object_or_404(self.get_queryset(), pk=kwargs["pk"])
        with transaction.atomic():
            ticket = Ticket.objects.select_for_update().select_related("event").get(pk=ticket.pk)
            if ticket.status == Ticket.Status.PAID:
                return Response({"detail": "Paid tickets cannot be cancelled through this endpoint."}, status=400)
            event = Event.objects.select_for_update().get(pk=ticket.event_id)
            if not ticket.inventory_released:
                event.available_tickets += 1
                event.save(update_fields=["available_tickets", "updated_at"])
                ticket.inventory_released = True
            ticket.status = Ticket.Status.CANCELLED
            ticket.save(update_fields=["status", "inventory_released"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related("ticket__event", "user").all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(user=self.request.user)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    http_method_names = ["get", "put", "patch", "delete", "head", "options"]


class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAdminRole()]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stk_push(request):
    ticket_id = request.data.get("ticket_id")
    phone_number = str(request.data.get("phone_number", "")).strip()
    if not ticket_id or not phone_number:
        return Response({"detail": "ticket_id and phone_number are required."}, status=400)

    with transaction.atomic():
        ticket = Ticket.objects.select_for_update().select_related("event").filter(pk=ticket_id).first()
        if ticket is None:
            return Response({"detail": "Ticket not found."}, status=404)
        if ticket.user_id != request.user.id and request.user.role != User.Role.ADMIN:
            return Response({"detail": "You do not own this ticket."}, status=403)
        if ticket.status in {Ticket.Status.PAID, Ticket.Status.CANCELLED}:
            return Response({"detail": "This ticket cannot be paid."}, status=400)
        if ticket.status == Ticket.Status.FAILED:
            return Response({"detail": "This ticket has failed. Book a new ticket."}, status=400)
        payment = Payment.objects.filter(ticket=ticket, status__in=[Payment.Status.PENDING, Payment.Status.INITIATED]).first()
        if payment is None:
            payment = Payment.objects.create(
                ticket=ticket,
                user=ticket.user,
                amount=Decimal(ticket.event.ticket_price),
                phone_number=phone_number,
            )
        else:
            payment.phone_number = phone_number
            payment.save(update_fields=["phone_number", "updated_at"])
        ticket.status = Ticket.Status.PENDING
        ticket.save(update_fields=["status"])

    try:
        mpesa_response = initiate_stk_push(payment)
    except (MpesaError, Exception) as exc:
        logger.exception("M-Pesa STK Push failed")
        with transaction.atomic():
            payment = Payment.objects.get(pk=payment.pk)
            payment.status = Payment.Status.FAILED
            payment.raw_response = {"error": str(exc)}
            payment.save(update_fields=["status", "raw_response", "updated_at"])
            ticket = Ticket.objects.select_for_update().select_related("event").get(pk=ticket_id)
            ticket.status = Ticket.Status.FAILED
            release_ticket_inventory(ticket)
            ticket.save(update_fields=["status", "inventory_released"])
        return Response({"detail": "Payment initiation failed. Please try again later."}, status=502)

    payment.status = Payment.Status.INITIATED
    payment.checkout_request_id = str(mpesa_response.get("CheckoutRequestID", ""))
    payment.merchant_request_id = str(mpesa_response.get("MerchantRequestID", ""))
    payment.raw_response = mpesa_response
    payment.save(update_fields=["status", "checkout_request_id", "merchant_request_id", "raw_response", "updated_at"])
    return Response({"message": "Payment initiated. Check your phone for the M-Pesa prompt.", "payment": PaymentSerializer(payment).data})


@api_view(["POST"])
@permission_classes([AllowAny])
def mpesa_callback(request):
    payload = request.data
    callback = payload.get("Body", {}).get("stkCallback", {})
    checkout_request_id = str(callback.get("CheckoutRequestID", ""))
    merchant_request_id = str(callback.get("MerchantRequestID", ""))
    payment = Payment.objects.filter(checkout_request_id=checkout_request_id).first() if checkout_request_id else None
    if payment is None and merchant_request_id:
        payment = Payment.objects.filter(merchant_request_id=merchant_request_id).first()
    if payment is None:
        logger.warning("Received M-Pesa callback with no matching payment: %s", payload)
        return Response({"status": "accepted", "message": "Callback received."})

    result_code = callback.get("ResultCode")
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related("ticket__event").get(pk=payment.pk)
        if payment.status == Payment.Status.COMPLETED:
            return Response({"status": "success", "message": "Payment already processed."})
        payment.raw_response = payload
        ticket = Ticket.objects.select_for_update().select_related("event").get(pk=payment.ticket_id)
        if str(result_code) == "0":
            metadata = {item.get("Name"): item.get("Value") for item in callback.get("CallbackMetadata", {}).get("Item", [])}
            payment.status = Payment.Status.COMPLETED
            payment.mpesa_receipt_number = str(metadata.get("MpesaReceiptNumber", ""))
            ticket.status = Ticket.Status.PAID
            payment.save(update_fields=["status", "mpesa_receipt_number", "raw_response", "updated_at"])
            ticket.save(update_fields=["status"])
            return Response({"status": "success", "message": "Payment received successfully."})

        payment.status = Payment.Status.FAILED
        ticket.status = Ticket.Status.FAILED
        release_ticket_inventory(ticket)
        payment.save(update_fields=["status", "raw_response", "updated_at"])
        ticket.save(update_fields=["status", "inventory_released"])
    return Response({"status": "failed", "message": callback.get("ResultDesc", "Payment failed.")})
