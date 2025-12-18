"""
Celery tasks for payment processing simulation.

Simulates external payment provider behavior with async confirmation
and webhook-driven state transitions.
"""

import logging
import random
import time

from celery import shared_task

logger = logging.getLogger(__name__)

# Test card numbers (matches Stripe test cards)
TEST_CARD_SUCCESS = "4242424242424242"
TEST_CARD_DECLINED = "4000000000000002"
TEST_CARD_INSUFFICIENT = "4000000000009995"


@shared_task(bind=True, max_retries=3)
def simulate_payment_provider(
    self,
    payment_id: str,
    card_number: str | None = None,
) -> dict:
    """
    Simulate payment provider processing.

    Determines payment outcome based on test card numbers:
    - 4242424242424242 → success
    - 4000000000000002 → declined
    - 4000000000009995 → insufficient funds
    - Other → random success/failure

    After determining outcome, triggers internal webhook to update payment state.
    This mirrors real Stripe behavior where confirmation is async.
    """
    from apps.payments.models import Payment

    logger.info(
        f"Processing payment {payment_id} with card {card_number[:4] if card_number else 'N/A'}****"
    )

    # Simulate network delay (0.5-2 seconds)
    time.sleep(random.uniform(0.5, 2.0))

    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        logger.error(f"Payment {payment_id} not found")
        return {"error": "Payment not found"}

    # Determine payment outcome based on card number
    if card_number == TEST_CARD_SUCCESS:
        event = "payment_intent.succeeded"
    elif card_number in (TEST_CARD_DECLINED, TEST_CARD_INSUFFICIENT):
        event = "payment_intent.failed"
    elif card_number:
        # Random outcome for other card numbers
        event = random.choice(["payment_intent.succeeded", "payment_intent.failed"])
    else:
        # No card provided - default to success for testing
        event = "payment_intent.succeeded"

    # Call internal webhook handler
    process_webhook_event.delay(
        event_type=event,
        payment_intent_id=payment.payment_intent_id,
    )

    logger.info(f"Payment {payment_id} simulation complete: {event}")
    return {"payment_id": payment_id, "event": event}


@shared_task
def process_webhook_event(event_type: str, payment_intent_id: str) -> dict:
    """
    Process webhook event and update payment status.

    This is the single source of truth for payment state changes.
    Business side-effects (e.g., booking confirmation) are triggered here.
    """
    from apps.payments.models import Payment

    logger.info(f"Processing webhook event {event_type} for {payment_intent_id}")

    try:
        payment = Payment.objects.get(payment_intent_id=payment_intent_id)
    except Payment.DoesNotExist:
        logger.error(f"Payment with intent {payment_intent_id} not found")
        return {"error": "Payment not found"}

    old_status = payment.status

    if event_type == "payment_intent.succeeded":
        payment.status = Payment.Status.SUCCEEDED
        # Trigger success side-effects
        process_successful_payment.delay(str(payment.id))

    elif event_type == "payment_intent.failed":
        payment.status = Payment.Status.FAILED

    payment.save()

    logger.info(f"Payment {payment_intent_id} status changed: {old_status} → {payment.status}")
    return {
        "payment_intent_id": payment_intent_id,
        "old_status": old_status,
        "new_status": payment.status,
    }


@shared_task
def process_successful_payment(payment_id: str) -> dict:
    """
    Handle successful payment side-effects.

    Updates booking status, sends notifications, etc.
    """
    from apps.bookings.models import Booking
    from apps.payments.models import Payment

    logger.info(f"Processing successful payment {payment_id}")

    try:
        payment = Payment.objects.select_related("booking").get(id=payment_id)
    except Payment.DoesNotExist:
        logger.error(f"Payment {payment_id} not found")
        return {"error": "Payment not found"}

    # Update booking status to confirmed
    booking = payment.booking
    if booking.status == Booking.Status.PENDING:
        booking.status = Booking.Status.CONFIRMED
        booking.save()
        logger.info(f"Booking {booking.id} confirmed after payment")

    return {
        "payment_id": payment_id,
        "booking_id": booking.id,
        "booking_status": booking.status,
    }
