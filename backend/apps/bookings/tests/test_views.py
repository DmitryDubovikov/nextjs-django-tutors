"""
Tests for bookings app views.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status

import pytest

from apps.bookings.models import Booking
from apps.core.tests.factories import AdminUserFactory, StudentUserFactory, TutorUserFactory
from apps.tutors.tests.factories import TutorFactory

from .factories import (
    BookingFactory,
    CancelledBookingFactory,
    CompletedBookingFactory,
    ConfirmedBookingFactory,
)


@pytest.mark.django_db
class TestBookingViewSet:
    """Tests for BookingViewSet."""

    def test_list_requires_authentication(self, api_client):
        """GET /api/bookings/ requires authentication."""
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_requires_authentication(self, api_client):
        """POST /api/bookings/ requires authentication."""
        response = api_client.post("/api/bookings/", {})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_student_bookings(self, api_client):
        """GET /api/bookings/ returns bookings for authenticated student."""
        student = StudentUserFactory()
        BookingFactory.create_batch(3, student=student)
        BookingFactory()  # Another student's booking

        api_client.force_authenticate(student)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 3

    def test_list_returns_tutor_bookings(self, api_client):
        """GET /api/bookings/ returns bookings for authenticated tutor."""
        tutor_user = TutorUserFactory()
        tutor = TutorFactory(user=tutor_user)
        BookingFactory.create_batch(2, tutor=tutor)
        BookingFactory()  # Another tutor's booking

        api_client.force_authenticate(tutor_user)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_list_returns_empty_when_no_bookings(self, api_client):
        """GET /api/bookings/ returns empty list when user has no bookings."""
        student = StudentUserFactory()

        api_client.force_authenticate(student)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_list_is_paginated(self, api_client):
        """GET /api/bookings/ returns paginated response."""
        student = StudentUserFactory()
        BookingFactory.create_batch(25, student=student)

        api_client.force_authenticate(student)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert "count" in response.data
        assert "next" in response.data
        assert "previous" in response.data
        assert "results" in response.data

    def test_retrieve_booking(self, api_client):
        """GET /api/bookings/{id}/ returns booking details."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.get(f"/api/bookings/{booking.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == booking.id
        assert response.data["tutor_name"] == booking.tutor.full_name

    def test_retrieve_returns_404_for_other_users_booking(self, api_client):
        """GET /api/bookings/{id}/ returns 404 for other user's booking."""
        student1 = StudentUserFactory()
        student2 = StudentUserFactory()
        booking = BookingFactory(student=student1)

        api_client.force_authenticate(student2)
        response = api_client.get(f"/api/bookings/{booking.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_booking_with_valid_data(self, api_client):
        """POST /api/bookings/ creates booking with valid data."""
        student = StudentUserFactory()
        tutor = TutorFactory(hourly_rate=Decimal("50.00"))
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            "notes": "Help with calculus",
        }

        api_client.force_authenticate(student)
        response = api_client.post("/api/bookings/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["tutor"] == tutor.id
        assert response.data["student"] == student.id
        assert response.data["duration_minutes"] == 60
        assert response.data["notes"] == "Help with calculus"
        assert Decimal(response.data["price"]) == Decimal("50.00")

    def test_create_booking_calculates_price(self, api_client):
        """POST /api/bookings/ automatically calculates price."""
        student = StudentUserFactory()
        tutor = TutorFactory(hourly_rate=Decimal("60.00"))
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 90,  # 1.5 hours
            "notes": "",
        }

        api_client.force_authenticate(student)
        response = api_client.post("/api/bookings/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        # 60.00 * 1.5 = 90.00
        assert Decimal(response.data["price"]) == Decimal("90.00")

    def test_create_booking_rejects_past_date(self, api_client):
        """POST /api/bookings/ rejects scheduled_at in the past."""
        student = StudentUserFactory()
        tutor = TutorFactory()
        past_time = timezone.now() - timedelta(days=1)

        data = {
            "tutor": tutor.id,
            "scheduled_at": past_time.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        api_client.force_authenticate(student)
        response = api_client.post("/api/bookings/", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "scheduled_at" in response.data

    def test_create_booking_sets_status_pending(self, api_client):
        """POST /api/bookings/ sets initial status to PENDING."""
        student = StudentUserFactory()
        tutor = TutorFactory()
        scheduled_at = timezone.now() + timedelta(days=7)

        data = {
            "tutor": tutor.id,
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": 60,
            "notes": "",
        }

        api_client.force_authenticate(student)
        response = api_client.post("/api/bookings/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == Booking.Status.PENDING

    def test_cancel_pending_booking_as_student(self, api_client):
        """POST /api/bookings/{id}/cancel/ cancels pending booking."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student, status=Booking.Status.PENDING)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CANCELLED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CANCELLED

    def test_cancel_confirmed_booking_as_student(self, api_client):
        """POST /api/bookings/{id}/cancel/ cancels confirmed booking."""
        student = StudentUserFactory()
        booking = ConfirmedBookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CANCELLED

    def test_cancel_cannot_cancel_completed_booking(self, api_client):
        """POST /api/bookings/{id}/cancel/ cannot cancel completed booking."""
        student = StudentUserFactory()
        booking = CompletedBookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_cancel_cannot_cancel_already_cancelled_booking(self, api_client):
        """POST /api/bookings/{id}/cancel/ cannot cancel already cancelled booking."""
        student = StudentUserFactory()
        booking = CancelledBookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_confirm_booking_as_tutor(self, api_client):
        """POST /api/bookings/{id}/confirm/ confirms pending booking as tutor."""
        tutor_user = TutorUserFactory()
        tutor = TutorFactory(user=tutor_user)
        booking = BookingFactory(tutor=tutor, status=Booking.Status.PENDING)

        api_client.force_authenticate(tutor_user)
        response = api_client.post(f"/api/bookings/{booking.id}/confirm/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CONFIRMED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CONFIRMED

    def test_confirm_booking_requires_tutor_ownership(self, api_client):
        """POST /api/bookings/{id}/confirm/ requires user to be the tutor."""
        tutor_user1 = TutorUserFactory()
        tutor1 = TutorFactory(user=tutor_user1)
        tutor_user2 = TutorUserFactory()
        TutorFactory(user=tutor_user2)  # Create tutor profile for user2
        booking = BookingFactory(tutor=tutor1, status=Booking.Status.PENDING)

        api_client.force_authenticate(tutor_user2)
        response = api_client.post(f"/api/bookings/{booking.id}/confirm/")

        # Returns 404 because queryset filters by tutor - other user can't see this booking
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_confirm_booking_student_cannot_confirm(self, api_client):
        """POST /api/bookings/{id}/confirm/ student cannot confirm booking."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student, status=Booking.Status.PENDING)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/confirm/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_confirm_booking_only_pending_can_be_confirmed(self, api_client):
        """POST /api/bookings/{id}/confirm/ only pending bookings can be confirmed."""
        tutor_user = TutorUserFactory()
        tutor = TutorFactory(user=tutor_user)
        booking = ConfirmedBookingFactory(tutor=tutor)

        api_client.force_authenticate(tutor_user)
        response = api_client.post(f"/api/bookings/{booking.id}/confirm/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_complete_booking_as_tutor(self, api_client):
        """POST /api/bookings/{id}/complete/ completes confirmed booking as tutor."""
        tutor_user = TutorUserFactory()
        tutor = TutorFactory(user=tutor_user)
        booking = ConfirmedBookingFactory(tutor=tutor)

        api_client.force_authenticate(tutor_user)
        response = api_client.post(f"/api/bookings/{booking.id}/complete/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.COMPLETED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.COMPLETED

    def test_complete_booking_requires_tutor_ownership(self, api_client):
        """POST /api/bookings/{id}/complete/ requires user to be the tutor."""
        tutor_user1 = TutorUserFactory()
        tutor1 = TutorFactory(user=tutor_user1)
        tutor_user2 = TutorUserFactory()
        TutorFactory(user=tutor_user2)  # Create tutor profile for user2
        booking = ConfirmedBookingFactory(tutor=tutor1)

        api_client.force_authenticate(tutor_user2)
        response = api_client.post(f"/api/bookings/{booking.id}/complete/")

        # Returns 404 because queryset filters by tutor - other user can't see this booking
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_complete_booking_student_cannot_complete(self, api_client):
        """POST /api/bookings/{id}/complete/ student cannot complete booking."""
        student = StudentUserFactory()
        booking = ConfirmedBookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/bookings/{booking.id}/complete/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_complete_booking_only_confirmed_can_be_completed(self, api_client):
        """POST /api/bookings/{id}/complete/ only confirmed bookings can be completed."""
        tutor_user = TutorUserFactory()
        tutor = TutorFactory(user=tutor_user)
        booking = BookingFactory(tutor=tutor, status=Booking.Status.PENDING)

        api_client.force_authenticate(tutor_user)
        response = api_client.post(f"/api/bookings/{booking.id}/complete/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_list_bookings_ordered_by_scheduled_at(self, api_client):
        """GET /api/bookings/ returns bookings ordered by scheduled_at descending."""
        student = StudentUserFactory()
        now = timezone.now()
        booking1 = BookingFactory(student=student, scheduled_at=now + timedelta(days=1))
        booking2 = BookingFactory(student=student, scheduled_at=now + timedelta(days=3))
        booking3 = BookingFactory(student=student, scheduled_at=now + timedelta(days=2))

        api_client.force_authenticate(student)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert results[0]["id"] == booking2.id
        assert results[1]["id"] == booking3.id
        assert results[2]["id"] == booking1.id

    def test_tutor_user_without_profile_returns_empty(self, api_client):
        """GET /api/bookings/ returns empty for tutor user without tutor profile."""
        # User with tutor type but no tutor profile created
        tutor_user = TutorUserFactory()

        api_client.force_authenticate(tutor_user)
        response = api_client.get("/api/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_get_serializer_class_returns_correct_serializer(self, api_client):
        """ViewSet returns CreateBookingSerializer for create action."""
        from apps.bookings.views import BookingViewSet

        viewset = BookingViewSet()
        viewset.action = "create"

        from apps.bookings.serializers import CreateBookingSerializer

        assert viewset.get_serializer_class() == CreateBookingSerializer

        viewset.action = "list"
        from apps.bookings.serializers import BookingSerializer

        assert viewset.get_serializer_class() == BookingSerializer

    def test_update_not_allowed(self, api_client):
        """PUT /api/bookings/{id}/ is not allowed."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.put(f"/api/bookings/{booking.id}/", {})

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_partial_update_not_allowed(self, api_client):
        """PATCH /api/bookings/{id}/ is not allowed."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.patch(f"/api/bookings/{booking.id}/", {})

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_delete_not_allowed(self, api_client):
        """DELETE /api/bookings/{id}/ is not allowed."""
        student = StudentUserFactory()
        booking = BookingFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.delete(f"/api/bookings/{booking.id}/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


@pytest.mark.django_db
class TestAdminBookingViewSet:
    """Tests for AdminBookingViewSet."""

    def test_list_requires_authentication(self, api_client):
        """GET /api/admin/bookings/ requires authentication."""
        response = api_client.get("/api/admin/bookings/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_requires_staff_permission(self, api_client):
        """GET /api/admin/bookings/ requires is_staff=True."""
        student = StudentUserFactory()

        api_client.force_authenticate(student)
        response = api_client.get("/api/admin/bookings/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_returns_all_bookings_for_admin(self, api_client):
        """GET /api/admin/bookings/ returns all bookings for staff user."""
        admin = AdminUserFactory()
        BookingFactory.create_batch(5)

        api_client.force_authenticate(admin)
        response = api_client.get("/api/admin/bookings/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5

    def test_retrieve_booking_as_admin(self, api_client):
        """GET /api/admin/bookings/{id}/ returns any booking for staff user."""
        admin = AdminUserFactory()
        booking = BookingFactory()

        api_client.force_authenticate(admin)
        response = api_client.get(f"/api/admin/bookings/{booking.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == booking.id

    def test_confirm_booking_as_admin(self, api_client):
        """POST /api/admin/bookings/{id}/confirm/ confirms any pending booking."""
        admin = AdminUserFactory()
        booking = BookingFactory(status=Booking.Status.PENDING)

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/confirm/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CONFIRMED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CONFIRMED

    def test_confirm_only_pending_bookings(self, api_client):
        """POST /api/admin/bookings/{id}/confirm/ only confirms pending bookings."""
        admin = AdminUserFactory()
        booking = ConfirmedBookingFactory()

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/confirm/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_cancel_booking_as_admin(self, api_client):
        """POST /api/admin/bookings/{id}/cancel/ cancels any booking."""
        admin = AdminUserFactory()
        booking = BookingFactory(status=Booking.Status.PENDING)

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CANCELLED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CANCELLED

    def test_cancel_confirmed_booking_as_admin(self, api_client):
        """POST /api/admin/bookings/{id}/cancel/ can cancel confirmed booking."""
        admin = AdminUserFactory()
        booking = ConfirmedBookingFactory()

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.CANCELLED

    def test_cannot_cancel_completed_booking(self, api_client):
        """POST /api/admin/bookings/{id}/cancel/ cannot cancel completed booking."""
        admin = AdminUserFactory()
        booking = CompletedBookingFactory()

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/cancel/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_complete_booking_as_admin(self, api_client):
        """POST /api/admin/bookings/{id}/complete/ completes confirmed booking."""
        admin = AdminUserFactory()
        booking = ConfirmedBookingFactory()

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/complete/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == Booking.Status.COMPLETED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.COMPLETED

    def test_complete_only_confirmed_bookings(self, api_client):
        """POST /api/admin/bookings/{id}/complete/ only completes confirmed bookings."""
        admin = AdminUserFactory()
        booking = BookingFactory(status=Booking.Status.PENDING)

        api_client.force_authenticate(admin)
        response = api_client.post(f"/api/admin/bookings/{booking.id}/complete/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_regular_user_cannot_access_admin_endpoints(self, api_client):
        """Regular users cannot access admin booking endpoints."""
        tutor_user = TutorUserFactory()
        booking = BookingFactory()

        api_client.force_authenticate(tutor_user)

        assert api_client.get("/api/admin/bookings/").status_code == status.HTTP_403_FORBIDDEN
        assert (
            api_client.get(f"/api/admin/bookings/{booking.id}/").status_code
            == status.HTTP_403_FORBIDDEN
        )
        assert (
            api_client.post(f"/api/admin/bookings/{booking.id}/confirm/").status_code
            == status.HTTP_403_FORBIDDEN
        )
        assert (
            api_client.post(f"/api/admin/bookings/{booking.id}/cancel/").status_code
            == status.HTTP_403_FORBIDDEN
        )
        assert (
            api_client.post(f"/api/admin/bookings/{booking.id}/complete/").status_code
            == status.HTTP_403_FORBIDDEN
        )
