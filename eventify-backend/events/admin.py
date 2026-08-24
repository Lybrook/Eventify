from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Event, Payment, SupportTicket, Ticket, User


@admin.register(User)
class EventifyUserAdmin(UserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "name", "role", "is_active", "created_at"]
    search_fields = ["email", "name"]
    fieldsets = UserAdmin.fieldsets + (("Eventify", {"fields": ("name", "role")}),)
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2", "role", "is_staff", "is_superuser")} ),
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "date", "location", "category", "ticket_price", "available_tickets", "featured"]
    list_filter = ["category", "featured", "date"]
    search_fields = ["title", "location", "description"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["id", "event", "user", "status", "purchase_date", "inventory_released"]
    list_filter = ["status", "inventory_released"]
    search_fields = ["event__title", "user__email"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["transaction_id", "ticket", "user", "amount", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["transaction_id", "checkout_request_id", "mpesa_receipt_number", "user__email"]


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["id", "email", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "email", "issue"]
