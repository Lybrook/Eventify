import base64
import os
import re
from decimal import Decimal

import requests
from django.db import transaction
from django.utils import timezone

from .models import Event, Payment, Ticket


class MpesaError(Exception):
    pass


def normalize_mpesa_phone(phone_number):
    digits = re.sub(r"\D", "", phone_number)
    if len(digits) == 10 and digits.startswith("0"):
        digits = f"254{digits[1:]}"
    elif len(digits) == 9 and digits[0] in {"1", "7"}:
        digits = f"254{digits}"
    if len(digits) != 12 or not digits.startswith("254") or digits[3] not in {"1", "7"}:
        raise ValueError("Enter a valid Kenyan M-Pesa number, such as 0712 345 678.")
    return digits


def _settings():
    environment = os.getenv("MPESA_ENVIRONMENT", "sandbox").lower()
    if environment not in {"sandbox", "production"}:
        raise MpesaError("MPESA_ENVIRONMENT must be 'sandbox' or 'production'")
    host = "https://sandbox.safaricom.co.ke" if environment == "sandbox" else "https://api.safaricom.co.ke"
    return {
        "host": host,
        "consumer_key": os.getenv("MPESA_CONSUMER_KEY", ""),
        "consumer_secret": os.getenv("MPESA_CONSUMER_SECRET", ""),
        "shortcode": os.getenv("MPESA_SHORTCODE", "174379"),
        "passkey": os.getenv("MPESA_PASSKEY", ""),
        "callback_url": os.getenv("MPESA_CALLBACK_URL", ""),
        "account_reference": os.getenv("MPESA_ACCOUNT_REFERENCE", "Eventify"),
        "transaction_description": os.getenv("MPESA_TRANSACTION_DESCRIPTION", "Eventify ticket payment"),
    }


def get_access_token():
    config = _settings()
    if not config["consumer_key"] or not config["consumer_secret"]:
        raise MpesaError("M-Pesa credentials are not configured")
    try:
        response = requests.get(
            f"{config['host']}/oauth/v1/generate?grant_type=client_credentials",
            auth=(config["consumer_key"], config["consumer_secret"]),
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaError("Could not authenticate with M-Pesa") from exc
    if not isinstance(data, dict):
        raise MpesaError("M-Pesa returned an invalid authentication response")
    token = data.get("access_token")
    if not token:
        raise MpesaError("M-Pesa did not return an access token")
    return token


def initiate_stk_push(payment: Payment):
    config = _settings()
    if not config["passkey"] or not config["callback_url"]:
        raise MpesaError("M-Pesa passkey and callback URL are required")

    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{config['shortcode']}{config['passkey']}{timestamp}".encode("utf-8")
    ).decode("utf-8")
    payment_amount = Decimal(payment.amount)
    if payment_amount != payment_amount.to_integral_value():
        raise MpesaError("M-Pesa payments must use whole Kenyan shillings.")
    amount = int(payment_amount)
    payload = {
        "BusinessShortCode": config["shortcode"],
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": payment.phone_number,
        "PartyB": config["shortcode"],
        "PhoneNumber": payment.phone_number,
        "CallBackURL": config["callback_url"],
        "AccountReference": config["account_reference"][:12],
        "TransactionDesc": config["transaction_description"][:13],
    }
    try:
        response = requests.post(
            f"{config['host']}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {get_access_token()}"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaError("Could not initiate the M-Pesa payment") from exc
    if not isinstance(data, dict):
        raise MpesaError("M-Pesa returned an invalid payment response")
    if data.get("ResponseCode") not in ("0", 0):
        raise MpesaError(data.get("ResponseDescription") or "M-Pesa rejected the STK Push")
    if not data.get("CheckoutRequestID") or not data.get("MerchantRequestID"):
        raise MpesaError("M-Pesa returned an incomplete payment response")
    return data


def query_stk_push(payment: Payment):
    config = _settings()
    if not config["passkey"] or not payment.checkout_request_id:
        raise MpesaError("M-Pesa payment verification is not configured")

    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{config['shortcode']}{config['passkey']}{timestamp}".encode("utf-8")
    ).decode("utf-8")
    payload = {
        "BusinessShortCode": config["shortcode"],
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": payment.checkout_request_id,
    }
    try:
        response = requests.post(
            f"{config['host']}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={"Authorization": f"Bearer {get_access_token()}"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaError("Could not verify the M-Pesa payment") from exc
    if not isinstance(data, dict) or data.get("ResponseCode") not in ("0", 0):
        raise MpesaError("M-Pesa could not verify the payment status")
    if (
        str(data.get("CheckoutRequestID", "")) != payment.checkout_request_id
        or str(data.get("MerchantRequestID", "")) != payment.merchant_request_id
        or data.get("ResultCode") is None
    ):
        raise MpesaError("M-Pesa returned an incomplete payment verification response")
    return data


def release_ticket_inventory(ticket: Ticket):
    if ticket.inventory_released:
        return
    event = Event.objects.select_for_update().get(pk=ticket.event_id)
    event.available_tickets += 1
    event.save(update_fields=["available_tickets", "updated_at"])
    ticket.inventory_released = True


def mark_payment_failed(payment_id, raw_response=None):
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related("ticket__event").get(pk=payment_id)
        if payment.status in (Payment.Status.COMPLETED, Payment.Status.FAILED):
            return payment
        payment.status = Payment.Status.FAILED
        if raw_response is not None:
            payment.raw_response = raw_response
        payment.save(update_fields=["status", "raw_response", "updated_at"])
        ticket = payment.ticket
        if ticket.status not in (Ticket.Status.PAID, Ticket.Status.CANCELLED, Ticket.Status.FAILED):
            ticket.status = Ticket.Status.FAILED
            release_ticket_inventory(ticket)
            ticket.save(update_fields=["status", "inventory_released"])
        return payment
