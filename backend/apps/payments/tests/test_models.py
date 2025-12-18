"""
Tests for Payment model.
"""

from decimal import Decimal

from django.db import IntegrityError

import pytest

from apps.bookings.tests.factories import BookingFactory
from apps.core.tests.factories import StudentUserFactory
from apps.payments.models import Payment
from apps.payments.tests.factories import (
    FailedPaymentFactory,
    PaymentFactory,
    ProcessingPaymentFactory,
    SucceededPaymentFactory,
)


@pytest.mark.django_db
class TestPaymentModel:
    """Tests for Payment model."""

    def test_create_payment_with_defaults(self):
        """Payment is created with default values."""
        payment = PaymentFactory()

        assert payment.id is not None
        assert payment.payment_intent_id.startswith("pi_")
        assert payment.idempotency_key is not None
        assert payment.amount == Decimal("50.00")
        assert payment.currency == "RUB"
        assert payment.status == Payment.Status.PENDING
        assert payment.booking is not None
        assert payment.user is not None

    def test_payment_str_representation(self):
        """__str__ returns formatted string."""
        payment = PaymentFactory(
            payment_intent_id="pi_test123",
            status=Payment.Status.SUCCEEDED,
            amount=Decimal("100.00"),
            currency="RUB",
        )

        assert "pi_test123" in str(payment)
        assert "succeeded" in str(payment)
        assert "100.00" in str(payment)
        assert "RUB" in str(payment)

    def test_payment_intent_id_unique(self):
        """payment_intent_id must be unique."""
        PaymentFactory(payment_intent_id="pi_duplicate")

        with pytest.raises(IntegrityError):
            PaymentFactory(payment_intent_id="pi_duplicate")

    def test_idempotency_key_unique(self):
        """idempotency_key must be unique."""
        PaymentFactory(idempotency_key="key_duplicate")

        with pytest.raises(IntegrityError):
            PaymentFactory(idempotency_key="key_duplicate")

    def test_payment_status_choices(self):
        """Payment can have all status choices."""
        pending = PaymentFactory(status=Payment.Status.PENDING)
        processing = ProcessingPaymentFactory()
        succeeded = SucceededPaymentFactory()
        failed = FailedPaymentFactory()

        assert pending.status == Payment.Status.PENDING
        assert processing.status == Payment.Status.PROCESSING
        assert succeeded.status == Payment.Status.SUCCEEDED
        assert failed.status == Payment.Status.FAILED

    def test_payment_metadata_json(self):
        """metadata stores JSON data."""
        metadata = {"card_last4": "4242", "card_brand": "visa"}
        payment = PaymentFactory(metadata=metadata)

        assert payment.metadata == metadata
        assert payment.metadata["card_last4"] == "4242"

    def test_multiple_payments_for_booking(self):
        """Multiple payments can be created for same booking."""
        booking = BookingFactory()
        user = StudentUserFactory()

        payment1 = PaymentFactory(
            booking=booking,
            user=user,
            idempotency_key="key1",
            payment_intent_id="pi_1",
        )
        payment2 = PaymentFactory(
            booking=booking,
            user=user,
            idempotency_key="key2",
            payment_intent_id="pi_2",
        )

        assert payment1.booking == payment2.booking
        assert booking.payments.count() == 2

    def test_payment_ordering(self):
        """Payments are ordered by created_at descending."""
        payment1 = PaymentFactory()
        payment2 = PaymentFactory()
        payment3 = PaymentFactory()

        payments = list(Payment.objects.all())

        assert payments[0] == payment3
        assert payments[1] == payment2
        assert payments[2] == payment1


@pytest.mark.django_db
class TestPaymentClassMethods:
    """Tests for Payment class methods."""

    def test_generate_payment_intent_id(self):
        """generate_payment_intent_id creates valid ID."""
        intent_id = Payment.generate_payment_intent_id()

        assert intent_id.startswith("pi_")
        assert len(intent_id) == 27  # "pi_" + 24 hex chars

    def test_generate_payment_intent_id_unique(self):
        """generate_payment_intent_id creates unique IDs."""
        id1 = Payment.generate_payment_intent_id()
        id2 = Payment.generate_payment_intent_id()

        assert id1 != id2

    def test_generate_client_secret(self):
        """generate_client_secret creates valid secret."""
        intent_id = "pi_test123"
        secret = Payment.generate_client_secret(intent_id)

        assert secret.startswith(f"{intent_id}_secret_")
        assert len(secret) > len(intent_id) + 8

    def test_generate_client_secret_unique(self):
        """generate_client_secret creates unique secrets."""
        intent_id = "pi_test123"
        secret1 = Payment.generate_client_secret(intent_id)
        secret2 = Payment.generate_client_secret(intent_id)

        assert secret1 != secret2


@pytest.mark.django_db
class TestPaymentRelations:
    """Tests for Payment model relations."""

    def test_cascade_delete_user(self):
        """Payment is deleted when user is deleted."""
        payment = PaymentFactory()
        user = payment.user
        payment_id = payment.id

        user.delete()

        assert not Payment.objects.filter(id=payment_id).exists()

    def test_cascade_delete_booking(self):
        """Payment is deleted when booking is deleted."""
        payment = PaymentFactory()
        booking = payment.booking
        payment_id = payment.id

        booking.delete()

        assert not Payment.objects.filter(id=payment_id).exists()

    def test_user_payments_relation(self):
        """User has payments related name."""
        user = StudentUserFactory()
        PaymentFactory(user=user, idempotency_key="key1", payment_intent_id="pi_1")
        PaymentFactory(user=user, idempotency_key="key2", payment_intent_id="pi_2")

        assert user.payments.count() == 2

    def test_booking_payments_relation(self):
        """Booking has payments related name."""
        booking = BookingFactory()
        PaymentFactory(booking=booking, idempotency_key="key1", payment_intent_id="pi_1")
        PaymentFactory(booking=booking, idempotency_key="key2", payment_intent_id="pi_2")

        assert booking.payments.count() == 2
