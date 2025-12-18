"""
Tests for Payment API views.
"""

from decimal import Decimal
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APIClient

import pytest

from apps.bookings.tests.factories import BookingFactory
from apps.core.tests.factories import AdminUserFactory, StudentUserFactory
from apps.payments.models import Payment
from apps.payments.tests.factories import (
    PaymentFactory,
    ProcessingPaymentFactory,
    SucceededPaymentFactory,
)


@pytest.fixture
def api_client():
    """Return API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """Return authenticated API client."""
    user = StudentUserFactory()
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def admin_client(api_client):
    """Return admin API client."""
    admin = AdminUserFactory()
    api_client.force_authenticate(user=admin)
    return api_client, admin


@pytest.mark.django_db
class TestCreatePaymentIntentView:
    """Tests for CreatePaymentIntentView."""

    def test_requires_authentication(self, api_client):
        """POST /api/payments/create-intent/ requires authentication."""
        response = api_client.post("/api/payments/create-intent/", {})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_creates_payment_intent(self, authenticated_client):
        """POST /api/payments/create-intent/ creates payment intent."""
        client, user = authenticated_client
        booking = BookingFactory(student=user)

        response = client.post(
            "/api/payments/create-intent/",
            {
                "booking_id": booking.id,
                "amount": "100.00",
                "currency": "RUB",
                "idempotency_key": "test-key-123",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert "payment_intent_id" in response.data
        assert "client_secret" in response.data
        assert response.data["amount"] == Decimal("100.00")
        assert response.data["status"] == "pending"
        assert response.data["created"] is True

    def test_idempotent_creation(self, authenticated_client):
        """Same idempotency_key returns same payment."""
        client, user = authenticated_client
        booking = BookingFactory(student=user)

        response1 = client.post(
            "/api/payments/create-intent/",
            {
                "booking_id": booking.id,
                "amount": "100.00",
                "idempotency_key": "same-key",
            },
        )

        response2 = client.post(
            "/api/payments/create-intent/",
            {
                "booking_id": booking.id,
                "amount": "100.00",
                "idempotency_key": "same-key",
            },
        )

        assert response1.status_code == status.HTTP_201_CREATED
        assert response2.status_code == status.HTTP_200_OK
        assert response1.data["payment_intent_id"] == response2.data["payment_intent_id"]
        assert response2.data["created"] is False

    def test_booking_not_found(self, authenticated_client):
        """Returns 404 for non-existent booking."""
        client, _ = authenticated_client

        response = client.post(
            "/api/payments/create-intent/",
            {
                "booking_id": 99999,
                "amount": "100.00",
                "idempotency_key": "test-key",
            },
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_booking_access_denied(self, authenticated_client):
        """Returns 404 for booking belonging to another user."""
        client, _ = authenticated_client
        other_user = StudentUserFactory()
        booking = BookingFactory(student=other_user)

        response = client.post(
            "/api/payments/create-intent/",
            {
                "booking_id": booking.id,
                "amount": "100.00",
                "idempotency_key": "test-key",
            },
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestConfirmPaymentView:
    """Tests for ConfirmPaymentView."""

    def test_requires_authentication(self, api_client):
        """POST /api/payments/confirm/ requires authentication."""
        response = api_client.post("/api/payments/confirm/", {})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("apps.payments.views.simulate_payment_provider.delay")
    def test_confirms_payment(self, mock_task, authenticated_client):
        """POST /api/payments/confirm/ confirms payment and triggers task."""
        client, user = authenticated_client
        payment = PaymentFactory(user=user, status=Payment.Status.PENDING)

        response = client.post(
            "/api/payments/confirm/",
            {
                "payment_intent_id": payment.payment_intent_id,
                "card_number": "4242424242424242",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "processing"
        mock_task.assert_called_once()

        payment.refresh_from_db()
        assert payment.status == Payment.Status.PROCESSING

    def test_payment_not_found(self, authenticated_client):
        """Returns 404 for non-existent payment."""
        client, _ = authenticated_client

        response = client.post(
            "/api/payments/confirm/",
            {"payment_intent_id": "pi_nonexistent"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_payment_access_denied(self, authenticated_client):
        """Returns 404 for payment belonging to another user."""
        client, _ = authenticated_client
        other_user = StudentUserFactory()
        payment = PaymentFactory(user=other_user)

        response = client.post(
            "/api/payments/confirm/",
            {"payment_intent_id": payment.payment_intent_id},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch("apps.payments.views.simulate_payment_provider.delay")
    def test_already_processing_returns_status(self, mock_task, authenticated_client):
        """Confirming already processing payment returns status without re-trigger."""
        client, user = authenticated_client
        payment = ProcessingPaymentFactory(user=user)

        response = client.post(
            "/api/payments/confirm/",
            {"payment_intent_id": payment.payment_intent_id},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "processing"
        mock_task.assert_not_called()

    @patch("apps.payments.views.simulate_payment_provider.delay")
    def test_already_succeeded_returns_status(self, mock_task, authenticated_client):
        """Confirming already succeeded payment returns status without re-trigger."""
        client, user = authenticated_client
        payment = SucceededPaymentFactory(user=user)

        response = client.post(
            "/api/payments/confirm/",
            {"payment_intent_id": payment.payment_intent_id},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "succeeded"
        mock_task.assert_not_called()


@pytest.mark.django_db
class TestWebhookSimulatorView:
    """Tests for WebhookSimulatorView."""

    def test_requires_admin(self, authenticated_client):
        """POST /api/payments/webhook-simulator/ requires admin."""
        client, _ = authenticated_client
        payment = PaymentFactory()

        response = client.post(
            "/api/payments/webhook-simulator/",
            {
                "event_type": "payment_intent.succeeded",
                "payment_intent_id": payment.payment_intent_id,
            },
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_processes_succeeded_event(self, admin_client):
        """Admin can process succeeded webhook event."""
        client, _ = admin_client
        payment = ProcessingPaymentFactory()

        response = client.post(
            "/api/payments/webhook-simulator/",
            {
                "event_type": "payment_intent.succeeded",
                "payment_intent_id": payment.payment_intent_id,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["processed"] is True
        assert response.data["payment_status"] == "succeeded"

        payment.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED

    def test_processes_failed_event(self, admin_client):
        """Admin can process failed webhook event."""
        client, _ = admin_client
        payment = ProcessingPaymentFactory()

        response = client.post(
            "/api/payments/webhook-simulator/",
            {
                "event_type": "payment_intent.failed",
                "payment_intent_id": payment.payment_intent_id,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["processed"] is True
        assert response.data["payment_status"] == "failed"

        payment.refresh_from_db()
        assert payment.status == Payment.Status.FAILED

    def test_payment_not_found(self, admin_client):
        """Returns 404 for non-existent payment."""
        client, _ = admin_client

        response = client.post(
            "/api/payments/webhook-simulator/",
            {
                "event_type": "payment_intent.succeeded",
                "payment_intent_id": "pi_nonexistent",
            },
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPaymentStatusView:
    """Tests for PaymentStatusView."""

    def test_requires_authentication(self, api_client):
        """GET /api/payments/status/{id}/ requires authentication."""
        payment = PaymentFactory()

        response = api_client.get(f"/api/payments/status/{payment.payment_intent_id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_payment_status(self, authenticated_client):
        """GET /api/payments/status/{id}/ returns payment status."""
        client, user = authenticated_client
        payment = SucceededPaymentFactory(user=user)

        response = client.get(f"/api/payments/status/{payment.payment_intent_id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "succeeded"
        assert response.data["payment_intent_id"] == payment.payment_intent_id

    def test_payment_not_found(self, authenticated_client):
        """Returns 404 for non-existent payment."""
        client, _ = authenticated_client

        response = client.get("/api/payments/status/pi_nonexistent/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_payment_access_denied(self, authenticated_client):
        """Returns 404 for payment belonging to another user."""
        client, _ = authenticated_client
        other_user = StudentUserFactory()
        payment = PaymentFactory(user=other_user)

        response = client.get(f"/api/payments/status/{payment.payment_intent_id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
