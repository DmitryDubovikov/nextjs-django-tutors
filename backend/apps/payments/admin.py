"""
Django admin configuration for payments app.
"""

from django.contrib import admin

from apps.payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "payment_intent_id",
        "status",
        "amount",
        "currency",
        "user",
        "booking",
        "created_at",
    ]
    list_filter = ["status", "currency", "created_at"]
    search_fields = ["payment_intent_id", "idempotency_key", "user__email"]
    readonly_fields = ["id", "payment_intent_id", "idempotency_key", "created_at", "updated_at"]
    raw_id_fields = ["user", "booking"]
    ordering = ["-created_at"]
