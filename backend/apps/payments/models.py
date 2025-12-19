"""
Payment models for mock Stripe payment system.

This module implements a production-like payment model that mirrors Stripe PaymentIntent behavior.
Key features: idempotency, webhook-driven state transitions, async confirmation.
"""

import uuid

from django.conf import settings
from django.db import models


class Payment(models.Model):
    """
    Payment model representing a Stripe-like PaymentIntent.

    Implements full payment lifecycle: pending -> processing -> succeeded/failed/refunded.
    Idempotency is guaranteed via idempotency_key.
    Final state changes only via webhook, not confirm endpoint.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payment_intent_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Mock PaymentIntent ID (pi_...)",
    )
    idempotency_key = models.CharField(
        max_length=64,
        unique=True,
        help_text="Client-provided idempotency key for safe retries",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Payment amount",
    )
    currency = models.CharField(
        max_length=3,
        default="RUB",
        help_text="Currency code (ISO 4217)",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current payment status",
    )

    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payments",
        help_text="Associated booking",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
        help_text="User who initiated the payment",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata (e.g., card type, last4 digits)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payment_intent_id"]),
            models.Index(fields=["idempotency_key"]),
            models.Index(fields=["status"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"Payment {self.payment_intent_id} ({self.status}) - {self.amount} {self.currency}"

    @classmethod
    def generate_payment_intent_id(cls) -> str:
        """Generate a Stripe-like payment intent ID."""
        return f"pi_{uuid.uuid4().hex[:24]}"

    @classmethod
    def generate_client_secret(cls, payment_intent_id: str) -> str:
        """Generate a Stripe-like client secret for the payment intent."""
        return f"{payment_intent_id}_secret_{uuid.uuid4().hex[:24]}"
