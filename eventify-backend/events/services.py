import base64
import os
from datetime import datetime
from decimal import Decimal

import requests
from django.db import transaction
from django.utils import timezone

from .models import Payment, Ticket


class MpesaError(Exception):
    pass


def _settings():
    environment = os.getenv("MPESA_ENVIRONMENT", "sandbox").lower()
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
    response = requests.get(
        f"{config['host']}/oauth/v1/generate?grant_type=client_credentials",
        auth=(config["consumer_key"], config["consumer_secret"]),
        timeout=20,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
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
    amount = int(Decimal(payment.amount).quantize(Decimal("1")))
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
        "AccountReference": f"{config['account_reference']}-{payment.transaction_id}",
        "TransactionDesc": config["transaction_description"],
    }
    response = requests.post(
        f"{config['host']}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {get_access_token()}"},
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    if data.get("ResponseCode") not in (None, "0", 0):
        raise MpesaError(data.get("ResponseDescription") or "M-Pesa rejected the STK Push")
    return data


def release_ticket_inventory(ticket: Ticket):
    if ticket.inventory_released:
        return
    event = ticket.event
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
