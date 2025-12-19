"""
Tests for Payment Celery tasks.
"""

from unittest.mock import patch

import pytest

from apps.bookings.models import Booking
from apps.bookings.tests.factories import BookingFactory, ConfirmedBookingFactory
from apps.payments.models import Payment
from apps.payments.tasks import (
    process_successful_payment,
    process_webhook_event,
    simulate_payment_provider,
)
from apps.payments.tests.factories import (
    ProcessingPaymentFactory,
    SucceededPaymentFactory,
)


@pytest.mark.django_db
class TestSimulatePaymentProvider:
    """Tests for simulate_payment_provider task."""

    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_success_card_triggers_succeeded_event(self, mock_webhook):
        """4242424242424242 card triggers succeeded event."""
        payment = ProcessingPaymentFactory()

        result = simulate_payment_provider(str(payment.id), "4242424242424242")

        assert result["event"] == "payment_intent.succeeded"
        mock_webhook.assert_called_once_with(
            event_type="payment_intent.succeeded",
            payment_intent_id=payment.payment_intent_id,
        )

    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_declined_card_triggers_failed_event(self, mock_webhook):
        """4000000000000002 card triggers failed event."""
        payment = ProcessingPaymentFactory()

        result = simulate_payment_provider(str(payment.id), "4000000000000002")

        assert result["event"] == "payment_intent.failed"
        mock_webhook.assert_called_once_with(
            event_type="payment_intent.failed",
            payment_intent_id=payment.payment_intent_id,
        )

    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_insufficient_funds_card_triggers_failed_event(self, mock_webhook):
        """4000000000009995 card triggers failed event."""
        payment = ProcessingPaymentFactory()

        result = simulate_payment_provider(str(payment.id), "4000000000009995")

        assert result["event"] == "payment_intent.failed"
        mock_webhook.assert_called_once_with(
            event_type="payment_intent.failed",
            payment_intent_id=payment.payment_intent_id,
        )

    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_no_card_defaults_to_success(self, mock_webhook):
        """No card number defaults to success for testing."""
        payment = ProcessingPaymentFactory()

        result = simulate_payment_provider(str(payment.id), None)

        assert result["event"] == "payment_intent.succeeded"
        mock_webhook.assert_called_once()

    def test_payment_not_found(self):
        """Non-existent payment returns error."""
        result = simulate_payment_provider(
            "00000000-0000-0000-0000-000000000000", "4242424242424242"
        )

        assert "error" in result
        assert result["error"] == "Payment not found"


@pytest.mark.django_db
class TestProcessWebhookEvent:
    """Tests for process_webhook_event task."""

    @patch("apps.payments.tasks.process_successful_payment.delay")
    def test_succeeded_event_updates_status(self, mock_success_handler):
        """Succeeded event updates payment status and triggers success handler."""
        payment = ProcessingPaymentFactory()

        result = process_webhook_event(
            event_type="payment_intent.succeeded",
            payment_intent_id=payment.payment_intent_id,
        )

        assert result["new_status"] == Payment.Status.SUCCEEDED
        mock_success_handler.assert_called_once_with(str(payment.id))

        payment.refresh_from_db()
        assert payment.status == Payment.Status.SUCCEEDED

    def test_failed_event_updates_status(self):
        """Failed event updates payment status."""
        payment = ProcessingPaymentFactory()

        result = process_webhook_event(
            event_type="payment_intent.failed",
            payment_intent_id=payment.payment_intent_id,
        )

        assert result["new_status"] == Payment.Status.FAILED

        payment.refresh_from_db()
        assert payment.status == Payment.Status.FAILED

    def test_payment_not_found(self):
        """Non-existent payment returns error."""
        result = process_webhook_event(
            event_type="payment_intent.succeeded",
            payment_intent_id="pi_nonexistent",
        )

        assert "error" in result
        assert result["error"] == "Payment not found"


@pytest.mark.django_db
class TestProcessSuccessfulPayment:
    """Tests for process_successful_payment task."""

    def test_confirms_pending_booking(self):
        """Successful payment confirms pending booking."""
        booking = BookingFactory(status=Booking.Status.PENDING)
        payment = SucceededPaymentFactory(booking=booking)

        result = process_successful_payment(str(payment.id))

        assert result["booking_status"] == Booking.Status.CONFIRMED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CONFIRMED

    def test_does_not_change_confirmed_booking(self):
        """Successful payment does not change already confirmed booking."""
        booking = ConfirmedBookingFactory()
        payment = SucceededPaymentFactory(booking=booking)

        result = process_successful_payment(str(payment.id))

        assert result["booking_status"] == Booking.Status.CONFIRMED

        booking.refresh_from_db()
        assert booking.status == Booking.Status.CONFIRMED

    def test_payment_not_found(self):
        """Non-existent payment returns error."""
        result = process_successful_payment("00000000-0000-0000-0000-000000000000")

        assert "error" in result
        assert result["error"] == "Payment not found"


@pytest.mark.django_db
class TestPaymentWorkflowIntegration:
    """Integration tests for complete payment workflow."""

    @patch("apps.payments.tasks.time.sleep")
    @patch("apps.payments.tasks.process_successful_payment.delay")
    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_complete_success_workflow(self, mock_webhook_delay, mock_success_delay, mock_sleep):
        """Complete workflow: simulate -> webhook -> booking confirmed."""
        booking = BookingFactory(status=Booking.Status.PENDING)
        payment = ProcessingPaymentFactory(booking=booking)

        # Make delay calls call the function synchronously
        mock_success_delay.side_effect = lambda payment_id: process_successful_payment(payment_id)
        mock_webhook_delay.side_effect = lambda **kwargs: process_webhook_event(**kwargs)

        simulate_payment_provider(str(payment.id), "4242424242424242")

        payment.refresh_from_db()
        booking.refresh_from_db()

        assert payment.status == Payment.Status.SUCCEEDED
        assert booking.status == Booking.Status.CONFIRMED

    @patch("apps.payments.tasks.time.sleep")
    @patch("apps.payments.tasks.process_webhook_event.delay")
    def test_complete_failure_workflow(self, mock_webhook_delay, mock_sleep):
        """Complete workflow: simulate -> webhook -> booking still pending."""
        booking = BookingFactory(status=Booking.Status.PENDING)
        payment = ProcessingPaymentFactory(booking=booking)

        # Make delay call the function synchronously
        mock_webhook_delay.side_effect = lambda **kwargs: process_webhook_event(**kwargs)

        simulate_payment_provider(str(payment.id), "4000000000000002")

        payment.refresh_from_db()
        booking.refresh_from_db()

        assert payment.status == Payment.Status.FAILED
        assert booking.status == Booking.Status.PENDING
