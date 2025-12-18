"""
Factory Boy factories for payments app models.

Provides test data factories for Payment model.
"""

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from apps.bookings.tests.factories import BookingFactory
from apps.core.tests.factories import StudentUserFactory
from apps.payments.models import Payment


class PaymentFactory(DjangoModelFactory):
    """Factory for Payment model."""

    class Meta:
        model = Payment

    payment_intent_id = factory.Sequence(lambda n: f"pi_test_{n:024d}")
    idempotency_key = factory.Faker("uuid4")

    amount = factory.LazyFunction(lambda: Decimal("50.00"))
    currency = "RUB"

    status = Payment.Status.PENDING

    booking = factory.SubFactory(BookingFactory)
    user = factory.SubFactory(StudentUserFactory)

    metadata = factory.Dict({})


class ProcessingPaymentFactory(PaymentFactory):
    """Factory for processing Payment."""

    status = Payment.Status.PROCESSING


class SucceededPaymentFactory(PaymentFactory):
    """Factory for succeeded Payment."""

    status = Payment.Status.SUCCEEDED


class FailedPaymentFactory(PaymentFactory):
    """Factory for failed Payment."""

    status = Payment.Status.FAILED


class RefundedPaymentFactory(PaymentFactory):
    """Factory for refunded Payment."""

    status = Payment.Status.REFUNDED
