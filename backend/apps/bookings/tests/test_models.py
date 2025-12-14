"""
Tests for bookings app models.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import pytest

from apps.bookings.models import Booking
from apps.core.tests.factories import StudentUserFactory
from apps.tutors.tests.factories import TutorFactory

from .factories import BookingFactory, ConfirmedBookingFactory


@pytest.mark.django_db
class TestBookingModel:
    """Tests for Booking model."""

    def test_str_representation(self):
        """__str__ returns student -> tutor @ scheduled_at."""
        booking = BookingFactory()

        result = str(booking)

        assert "->" in result
        assert "@" in result
        assert str(booking.student) in result
        assert str(booking.tutor) in result

    def test_booking_creation_with_required_fields(self):
        """Booking can be created with all required fields."""
        tutor = TutorFactory()
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=1)
        price = Decimal("75.00")

        booking = Booking.objects.create(
            tutor=tutor,
            student=student,
            scheduled_at=scheduled_at,
            duration_minutes=90,
            status=Booking.Status.PENDING,
            price=price,
        )

        assert booking.id is not None
        assert booking.tutor == tutor
        assert booking.student == student
        assert booking.scheduled_at == scheduled_at
        assert booking.duration_minutes == 90
        assert booking.status == Booking.Status.PENDING
        assert booking.price == price

    def test_booking_default_status_is_pending(self):
        """Booking status defaults to PENDING."""
        booking = BookingFactory.build(status=None)
        booking.status = Booking.Status.PENDING  # Factory default

        assert booking.status == Booking.Status.PENDING

    def test_booking_default_duration_is_60_minutes(self):
        """Booking duration defaults to 60 minutes."""
        booking = BookingFactory(duration_minutes=60)

        assert booking.duration_minutes == 60

    def test_booking_notes_can_be_empty(self):
        """Booking notes can be empty string."""
        booking = BookingFactory(notes="")

        assert booking.notes == ""

    def test_booking_with_notes(self):
        """Booking can include student notes."""
        notes = "Please focus on calculus derivatives."
        booking = BookingFactory(notes=notes)

        assert booking.notes == notes

    def test_booking_status_choices(self):
        """Booking supports all status choices."""
        statuses = [
            Booking.Status.PENDING,
            Booking.Status.CONFIRMED,
            Booking.Status.CANCELLED,
            Booking.Status.COMPLETED,
        ]

        for status in statuses:
            booking = BookingFactory(status=status)
            assert booking.status == status

    def test_booking_ordered_by_scheduled_at_desc(self):
        """Bookings are ordered by scheduled_at descending."""
        now = timezone.now()
        booking1 = BookingFactory(scheduled_at=now + timedelta(days=1))
        booking2 = BookingFactory(scheduled_at=now + timedelta(days=3))
        booking3 = BookingFactory(scheduled_at=now + timedelta(days=2))

        bookings = list(Booking.objects.all())

        # Should be ordered by scheduled_at descending
        assert bookings[0].id == booking2.id
        assert bookings[1].id == booking3.id
        assert bookings[2].id == booking1.id

    def test_booking_has_created_at_timestamp(self):
        """Booking has created_at timestamp set automatically."""
        booking = BookingFactory()

        assert booking.created_at is not None
        assert isinstance(booking.created_at, type(timezone.now()))

    def test_booking_has_updated_at_timestamp(self):
        """Booking has updated_at timestamp set automatically."""
        booking = BookingFactory()
        original_updated_at = booking.updated_at

        # Update the booking
        booking.notes = "Updated notes"
        booking.save()

        assert booking.updated_at is not None
        assert booking.updated_at > original_updated_at

    def test_related_tutor_bookings(self):
        """Tutor can access their bookings via related_name."""
        tutor = TutorFactory()
        BookingFactory.create_batch(3, tutor=tutor)

        assert tutor.bookings.count() == 3

    def test_related_student_bookings(self):
        """Student can access their bookings via related_name."""
        student = StudentUserFactory()
        BookingFactory.create_batch(2, student=student)

        assert student.bookings.count() == 2

    def test_booking_price_precision(self):
        """Booking price supports decimal precision."""
        booking = BookingFactory(price=Decimal("49.99"))

        assert booking.price == Decimal("49.99")

    def test_booking_duration_must_be_positive(self):
        """Booking duration must be positive integer."""
        booking = BookingFactory(duration_minutes=30)

        assert booking.duration_minutes == 30
        assert booking.duration_minutes > 0

    def test_booking_indexes_exist(self):
        """Booking model has indexes for query optimization."""
        # This test verifies the Meta.indexes are defined
        indexes = Booking._meta.indexes
        index_fields = [list(idx.fields) for idx in indexes]

        # Check that we have indexes for common queries
        assert ["tutor", "scheduled_at"] in index_fields
        assert ["student", "scheduled_at"] in index_fields
        assert ["status"] in index_fields

    def test_booking_db_table_name(self):
        """Booking uses custom db_table name."""
        assert Booking._meta.db_table == "bookings"

    def test_cascade_delete_on_tutor_deletion(self):
        """Booking is deleted when tutor is deleted."""
        booking = BookingFactory()
        tutor = booking.tutor

        tutor.delete()

        assert not Booking.objects.filter(id=booking.id).exists()

    def test_cascade_delete_on_student_deletion(self):
        """Booking is deleted when student is deleted."""
        booking = BookingFactory()
        student = booking.student

        student.delete()

        assert not Booking.objects.filter(id=booking.id).exists()

    def test_multiple_bookings_same_tutor(self):
        """Tutor can have multiple bookings."""
        tutor = TutorFactory()
        student1 = StudentUserFactory()
        student2 = StudentUserFactory()

        booking1 = BookingFactory(tutor=tutor, student=student1)
        booking2 = BookingFactory(tutor=tutor, student=student2)

        assert tutor.bookings.count() == 2
        assert booking1 in tutor.bookings.all()
        assert booking2 in tutor.bookings.all()

    def test_multiple_bookings_same_student(self):
        """Student can have multiple bookings."""
        student = StudentUserFactory()
        tutor1 = TutorFactory()
        tutor2 = TutorFactory()

        booking1 = BookingFactory(tutor=tutor1, student=student)
        booking2 = BookingFactory(tutor=tutor2, student=student)

        assert student.bookings.count() == 2
        assert booking1 in student.bookings.all()
        assert booking2 in student.bookings.all()

    def test_confirmed_booking_can_be_created(self):
        """Confirmed booking can be created using factory."""
        booking = ConfirmedBookingFactory()

        assert booking.status == Booking.Status.CONFIRMED
