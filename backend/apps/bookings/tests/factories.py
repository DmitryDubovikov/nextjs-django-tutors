"""
Factory Boy factories for bookings app models.

Provides test data factories for Booking model.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import factory
from factory.django import DjangoModelFactory

from apps.bookings.models import Booking
from apps.core.tests.factories import StudentUserFactory
from apps.tutors.tests.factories import TutorFactory


class BookingFactory(DjangoModelFactory):
    """Factory for Booking model."""

    class Meta:
        model = Booking

    tutor = factory.SubFactory(TutorFactory)
    student = factory.SubFactory(StudentUserFactory)
    scheduled_at = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))
    duration_minutes = 60
    status = Booking.Status.PENDING
    price = factory.LazyFunction(lambda: Decimal("50.00"))
    notes = factory.Faker("sentence", nb_words=10)


class ConfirmedBookingFactory(BookingFactory):
    """Factory for confirmed Booking."""

    status = Booking.Status.CONFIRMED


class CancelledBookingFactory(BookingFactory):
    """Factory for cancelled Booking."""

    status = Booking.Status.CANCELLED


class CompletedBookingFactory(BookingFactory):
    """Factory for completed Booking."""

    status = Booking.Status.COMPLETED
    scheduled_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=7))
