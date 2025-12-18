"""
Serializers for payment endpoints.

Provides serializers for creating PaymentIntents, confirming payments,
and handling webhook events.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.payments.models import Payment


class CreatePaymentIntentSerializer(serializers.Serializer):
    """Serializer for creating a new PaymentIntent."""

    booking_id = serializers.IntegerField(help_text="ID of the booking to pay for")
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        help_text="Payment amount (minimum 0.01)",
    )
    currency = serializers.CharField(
        max_length=3,
        default="RUB",
        help_text="Currency code (ISO 4217)",
    )
    idempotency_key = serializers.CharField(
        max_length=64,
        help_text="Client-provided idempotency key for safe retries",
    )
    metadata = serializers.JSONField(
        default=dict,
        required=False,
        help_text="Optional metadata",
    )


class PaymentIntentResponseSerializer(serializers.Serializer):
    """Serializer for PaymentIntent creation response."""

    payment_intent_id = serializers.CharField(help_text="Mock PaymentIntent ID")
    client_secret = serializers.CharField(help_text="Client secret for frontend")
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    status = serializers.CharField()
    created = serializers.BooleanField(help_text="True if newly created, False if existing")


class ConfirmPaymentSerializer(serializers.Serializer):
    """Serializer for confirming a payment."""

    payment_intent_id = serializers.CharField(help_text="PaymentIntent ID to confirm")
    card_number = serializers.CharField(
        max_length=19,
        required=False,
        help_text="Test card number (use 4242424242424242 for success)",
    )


class ConfirmPaymentResponseSerializer(serializers.Serializer):
    """Serializer for payment confirmation response."""

    status = serializers.CharField(help_text="Current payment status")
    payment_intent_id = serializers.CharField()


class WebhookEventSerializer(serializers.Serializer):
    """Serializer for webhook events (admin-only)."""

    event_type = serializers.ChoiceField(
        choices=[
            ("payment_intent.succeeded", "Payment Succeeded"),
            ("payment_intent.failed", "Payment Failed"),
        ],
        help_text="Webhook event type",
    )
    payment_intent_id = serializers.CharField(help_text="PaymentIntent ID")


class WebhookResponseSerializer(serializers.Serializer):
    """Serializer for webhook response."""

    processed = serializers.BooleanField()
    payment_status = serializers.CharField()


class PaymentSerializer(serializers.ModelSerializer):
    """Full payment serializer for listing/retrieving payments."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_intent_id",
            "amount",
            "currency",
            "status",
            "booking",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
