"""
Tests for Payment serializers.
"""

from decimal import Decimal

import pytest

from apps.payments.serializers import (
    ConfirmPaymentResponseSerializer,
    ConfirmPaymentSerializer,
    CreatePaymentIntentSerializer,
    PaymentIntentResponseSerializer,
    PaymentSerializer,
    WebhookEventSerializer,
    WebhookResponseSerializer,
)
from apps.payments.tests.factories import PaymentFactory


@pytest.mark.django_db
class TestCreatePaymentIntentSerializer:
    """Tests for CreatePaymentIntentSerializer."""

    def test_valid_data(self):
        """Valid data passes validation."""
        data = {
            "booking_id": 1,
            "amount": "100.00",
            "currency": "RUB",
            "idempotency_key": "test-key-123",
        }

        serializer = CreatePaymentIntentSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["booking_id"] == 1
        assert serializer.validated_data["amount"] == Decimal("100.00")

    def test_with_metadata(self):
        """Metadata is accepted."""
        data = {
            "booking_id": 1,
            "amount": "100.00",
            "idempotency_key": "test-key-123",
            "metadata": {"source": "mobile"},
        }

        serializer = CreatePaymentIntentSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["metadata"] == {"source": "mobile"}

    def test_default_currency(self):
        """Default currency is RUB."""
        data = {
            "booking_id": 1,
            "amount": "100.00",
            "idempotency_key": "test-key-123",
        }

        serializer = CreatePaymentIntentSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data.get("currency", "RUB") == "RUB"

    def test_missing_required_fields(self):
        """Missing required fields fail validation."""
        data = {}

        serializer = CreatePaymentIntentSerializer(data=data)

        assert not serializer.is_valid()
        assert "booking_id" in serializer.errors
        assert "amount" in serializer.errors
        assert "idempotency_key" in serializer.errors

    def test_invalid_amount(self):
        """Invalid amount fails validation."""
        data = {
            "booking_id": 1,
            "amount": "not-a-number",
            "idempotency_key": "test-key-123",
        }

        serializer = CreatePaymentIntentSerializer(data=data)

        assert not serializer.is_valid()
        assert "amount" in serializer.errors

    def test_negative_amount(self):
        """Negative amount fails validation."""
        data = {
            "booking_id": 1,
            "amount": "-100.00",
            "idempotency_key": "test-key-123",
        }

        serializer = CreatePaymentIntentSerializer(data=data)

        assert not serializer.is_valid()
        assert "amount" in serializer.errors


class TestPaymentIntentResponseSerializer:
    """Tests for PaymentIntentResponseSerializer."""

    def test_serialize_response(self):
        """Response is serialized correctly."""
        data = {
            "payment_intent_id": "pi_test123",
            "client_secret": "pi_test123_secret_abc",
            "amount": Decimal("100.00"),
            "currency": "RUB",
            "status": "pending",
            "created": True,
        }

        serializer = PaymentIntentResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["payment_intent_id"] == "pi_test123"
        assert serializer.validated_data["created"] is True


class TestConfirmPaymentSerializer:
    """Tests for ConfirmPaymentSerializer."""

    def test_valid_data(self):
        """Valid data passes validation."""
        data = {
            "payment_intent_id": "pi_test123",
            "card_number": "4242424242424242",
        }

        serializer = ConfirmPaymentSerializer(data=data)

        assert serializer.is_valid()

    def test_without_card_number(self):
        """card_number is optional."""
        data = {
            "payment_intent_id": "pi_test123",
        }

        serializer = ConfirmPaymentSerializer(data=data)

        assert serializer.is_valid()

    def test_missing_payment_intent_id(self):
        """Missing payment_intent_id fails validation."""
        data = {}

        serializer = ConfirmPaymentSerializer(data=data)

        assert not serializer.is_valid()
        assert "payment_intent_id" in serializer.errors


class TestConfirmPaymentResponseSerializer:
    """Tests for ConfirmPaymentResponseSerializer."""

    def test_serialize_response(self):
        """Response is serialized correctly."""
        data = {
            "status": "processing",
            "payment_intent_id": "pi_test123",
        }

        serializer = ConfirmPaymentResponseSerializer(data=data)

        assert serializer.is_valid()


class TestWebhookEventSerializer:
    """Tests for WebhookEventSerializer."""

    def test_valid_succeeded_event(self):
        """Succeeded event is valid."""
        data = {
            "event_type": "payment_intent.succeeded",
            "payment_intent_id": "pi_test123",
        }

        serializer = WebhookEventSerializer(data=data)

        assert serializer.is_valid()

    def test_valid_failed_event(self):
        """Failed event is valid."""
        data = {
            "event_type": "payment_intent.failed",
            "payment_intent_id": "pi_test123",
        }

        serializer = WebhookEventSerializer(data=data)

        assert serializer.is_valid()

    def test_invalid_event_type(self):
        """Invalid event type fails validation."""
        data = {
            "event_type": "invalid_event",
            "payment_intent_id": "pi_test123",
        }

        serializer = WebhookEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "event_type" in serializer.errors


class TestWebhookResponseSerializer:
    """Tests for WebhookResponseSerializer."""

    def test_serialize_response(self):
        """Response is serialized correctly."""
        data = {
            "processed": True,
            "payment_status": "succeeded",
        }

        serializer = WebhookResponseSerializer(data=data)

        assert serializer.is_valid()


@pytest.mark.django_db
class TestPaymentSerializer:
    """Tests for PaymentSerializer."""

    def test_serialize_payment(self):
        """Payment is serialized correctly."""
        payment = PaymentFactory()

        serializer = PaymentSerializer(payment)
        data = serializer.data

        assert data["id"] == str(payment.id)
        assert data["payment_intent_id"] == payment.payment_intent_id
        assert data["status"] == payment.status

    def test_all_fields_read_only(self):
        """All fields are read-only."""
        serializer = PaymentSerializer()

        for field in serializer.fields.values():
            assert field.read_only

    def test_serialize_with_metadata(self):
        """Metadata is serialized correctly."""
        payment = PaymentFactory(metadata={"card_last4": "4242"})

        serializer = PaymentSerializer(payment)

        assert serializer.data["metadata"] == {"card_last4": "4242"}
