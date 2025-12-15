"""
Tests for bookings app serializers.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

import pytest

from apps.bookings.serializers import BookingSerializer, CreateBookingSerializer
from apps.core.tests.factories import StudentUserFactory
from apps.tutors.tests.factories import TutorFactory

from .factories import BookingFactory


@pytest.mark.django_db
class TestBookingSerializer:
    """Tests for BookingSerializer."""

    def test_serialize_booking(self):
        """Serializer correctly serializes booking instance."""
        booking = BookingFactory()

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["id"] == booking.id
        assert data["tutor"] == booking.tutor.id
        assert data["tutor_name"] == booking.tutor.full_name
        assert data["tutor_slug"] == booking.tutor.slug
        assert data["student"] == booking.student.id
        assert data["duration_minutes"] == booking.duration_minutes
        assert data["status"] == booking.status
        assert Decimal(data["price"]) == booking.price
        assert data["notes"] == booking.notes

    def test_serialize_includes_student_name(self):
        """Serializer includes student's full name."""
        student = StudentUserFactory(first_name="John", last_name="Doe")
        booking = BookingFactory(student=student)

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["student_name"] == "John Doe"

    def test_serialize_student_name_falls_back_to_username(self):
        """Serializer uses username when student has no full name."""
        student = StudentUserFactory(first_name="", last_name="", username="johndoe")
        booking = BookingFactory(student=student)

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["student_name"] == "johndoe"

    def test_serialize_includes_tutor_name(self):
        """Serializer includes tutor's full name."""
        booking = BookingFactory()

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["tutor_name"] == booking.tutor.full_name

    def test_serialize_includes_tutor_slug(self):
        """Serializer includes tutor's slug for URL generation."""
        booking = BookingFactory()

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["tutor_slug"] == booking.tutor.slug

    def test_serialize_includes_timestamps(self):
        """Serializer includes created_at and updated_at timestamps."""
        booking = BookingFactory()

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert "created_at" in data
        assert "updated_at" in data

    def test_read_only_fields(self):
        """Student and price fields are read-only."""
        booking = BookingFactory()
        serializer = BookingSerializer(booking)

        read_only_fields = serializer.Meta.read_only_fields

        assert "student" in read_only_fields
        assert "price" in read_only_fields
        assert "created_at" in read_only_fields
        assert "updated_at" in read_only_fields

    def test_serialize_booking_with_empty_notes(self):
        """Serializer handles booking with empty notes."""
        booking = BookingFactory(notes="")

        serializer = BookingSerializer(booking)
        data = serializer.data

        assert data["notes"] == ""

    def test_serialize_booking_list(self):
        """Serializer can serialize multiple bookings."""
        bookings = BookingFactory.create_batch(3)

        serializer = BookingSerializer(bookings, many=True)
        data = serializer.data

        assert len(data) == 3


@pytest.mark.django_db
class TestCreateBookingSerializer:
    """Tests for CreateBookingSerializer."""

    def test_create_booking_with_valid_data(self):
        """Serializer creates booking with valid data."""
        tutor = TutorFactory(hourly_rate=Decimal("50.00"))
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            "notes": "Please help with algebra.",
        }

        # Mock request with authenticated user
        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid(), serializer.errors

        booking = serializer.save()

        assert booking.tutor == tutor
        assert booking.student == student
        assert booking.duration_minutes == 60
        assert booking.notes == "Please help with algebra."

    def test_create_booking_calculates_price(self):
        """Serializer automatically calculates price based on hourly rate."""
        tutor = TutorFactory(hourly_rate=Decimal("60.00"))
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 90,  # 1.5 hours
            "notes": "",
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid()

        booking = serializer.save()

        # 60.00 * 1.5 = 90.00
        assert booking.price == Decimal("90.00")

    def test_create_booking_sets_student_from_request(self):
        """Serializer sets student from request user."""
        tutor = TutorFactory()
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid()

        booking = serializer.save()

        assert booking.student == student

    def test_create_booking_defaults_duration_minutes(self):
        """Serializer uses default duration_minutes from model when not provided."""
        tutor = TutorFactory(hourly_rate=Decimal("50.00"))
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            # duration_minutes not provided - should use model default (60)
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        # duration_minutes is optional in serializer, uses model default
        assert serializer.is_valid()
        booking = serializer.save()
        assert booking.duration_minutes == 60  # Model default
        # Price calculated with default duration: 50.00 * (60/60) = 50.00
        assert booking.price == Decimal("50.00")

    def test_validate_scheduled_at_in_future(self):
        """Serializer validates scheduled_at must be in the future."""
        tutor = TutorFactory()
        past_time = timezone.now() - timedelta(days=1)

        data = {
            "tutor": tutor.id,
            "scheduled_at": past_time.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        serializer = CreateBookingSerializer(data=data)

        assert not serializer.is_valid()
        assert "scheduled_at" in serializer.errors
        assert "must be in the future" in str(serializer.errors["scheduled_at"]).lower()

    def test_validate_scheduled_at_accepts_future(self):
        """Serializer accepts scheduled_at in the future."""
        tutor = TutorFactory()
        future_time = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": future_time.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        serializer = CreateBookingSerializer(data=data)

        assert serializer.is_valid()

    def test_create_booking_without_notes(self):
        """Serializer creates booking without notes (optional field)."""
        tutor = TutorFactory()
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            # notes not provided
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid()

    def test_create_booking_price_calculation_30_minutes(self):
        """Serializer correctly calculates price for 30 minutes."""
        tutor = TutorFactory(hourly_rate=Decimal("40.00"))
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 30,  # 0.5 hours
            "notes": "",
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid()

        booking = serializer.save()

        # 40.00 * 0.5 = 20.00
        assert booking.price == Decimal("20.00")

    def test_create_booking_price_calculation_120_minutes(self):
        """Serializer correctly calculates price for 120 minutes."""
        tutor = TutorFactory(hourly_rate=Decimal("75.00"))
        student = StudentUserFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 120,  # 2 hours
            "notes": "",
        }

        class MockRequest:
            user = student

        serializer = CreateBookingSerializer(data=data, context={"request": MockRequest()})
        assert serializer.is_valid()

        booking = serializer.save()

        # 75.00 * 2 = 150.00
        assert booking.price == Decimal("150.00")

    def test_serializer_fields(self):
        """Serializer only includes required fields for creation."""
        serializer = CreateBookingSerializer()
        fields = serializer.Meta.fields

        assert fields == ["tutor", "scheduled_at", "duration_minutes", "notes"]

    def test_invalid_tutor_id(self):
        """Serializer validates tutor exists."""
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": 99999,  # Non-existent tutor
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        serializer = CreateBookingSerializer(data=data)

        assert not serializer.is_valid()
        assert "tutor" in serializer.errors
