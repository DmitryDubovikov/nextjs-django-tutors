"""
Payment API views.

Implements mock Stripe-like payment flow:
- CreatePaymentIntent: Creates idempotent payment intents
- ConfirmPayment: Triggers async payment processing
- WebhookSimulator: Admin endpoint to simulate webhook events
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.payments.serializers import (
    ConfirmPaymentResponseSerializer,
    ConfirmPaymentSerializer,
    CreatePaymentIntentSerializer,
    PaymentIntentResponseSerializer,
    WebhookEventSerializer,
    WebhookResponseSerializer,
)
from apps.payments.tasks import simulate_payment_provider


class CreatePaymentIntentView(APIView):
    """
    Create a new PaymentIntent (mock Stripe API).

    Idempotent: same idempotency_key returns the same payment without creating duplicates.
    This mirrors Stripe's behavior for safe client retries.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CreatePaymentIntentSerializer,
        responses={200: PaymentIntentResponseSerializer, 201: PaymentIntentResponseSerializer},
        tags=["payments"],
        summary="Create payment intent",
        description="Create a new PaymentIntent for a booking. Idempotent via idempotency_key.",
    )
    def post(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Verify booking exists and belongs to user
        try:
            booking = Booking.objects.get(
                id=serializer.validated_data["booking_id"],
                student=request.user,
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotent creation
        payment, created = Payment.objects.get_or_create(
            idempotency_key=serializer.validated_data["idempotency_key"],
            defaults={
                "payment_intent_id": Payment.generate_payment_intent_id(),
                "amount": serializer.validated_data["amount"],
                "currency": serializer.validated_data.get("currency", "RUB"),
                "status": Payment.Status.PENDING,
                "booking": booking,
                "user": request.user,
                "metadata": serializer.validated_data.get("metadata", {}),
            },
        )

        response_data = {
            "payment_intent_id": payment.payment_intent_id,
            "client_secret": Payment.generate_client_secret(payment.payment_intent_id),
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "created": created,
        }

        response_serializer = PaymentIntentResponseSerializer(data=response_data)
        response_serializer.is_valid(raise_exception=True)

        return Response(
            response_serializer.validated_data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConfirmPaymentView(APIView):
    """
    Confirm a PaymentIntent (trigger payment processing).

    This endpoint does NOT finalize the payment status.
    It only transitions to 'processing' and triggers async provider simulation.
    Final status is determined via webhook callback.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ConfirmPaymentSerializer,
        responses={200: ConfirmPaymentResponseSerializer},
        tags=["payments"],
        summary="Confirm payment",
        description="Confirm a PaymentIntent. Triggers async payment processing.",
    )
    def post(self, request):
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payment = Payment.objects.get(
                payment_intent_id=serializer.validated_data["payment_intent_id"],
                user=request.user,
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # If already processed, return current status
        if payment.status != Payment.Status.PENDING:
            return Response(
                {
                    "status": payment.status,
                    "payment_intent_id": payment.payment_intent_id,
                }
            )

        # Transition to processing
        payment.status = Payment.Status.PROCESSING
        payment.save()

        # Trigger async payment simulation
        simulate_payment_provider.delay(
            payment_id=str(payment.id),
            card_number=serializer.validated_data.get("card_number"),
        )

        return Response(
            {
                "status": payment.status,
                "payment_intent_id": payment.payment_intent_id,
            }
        )


class WebhookSimulatorView(APIView):
    """
    Simulate webhook events (admin-only).

    Allows manual testing of webhook-driven state transitions.
    In production, this would be replaced by actual Stripe webhooks.
    """

    permission_classes = [IsAdminUser]

    @extend_schema(
        request=WebhookEventSerializer,
        responses={200: WebhookResponseSerializer},
        tags=["payments"],
        summary="Simulate webhook",
        description="Admin endpoint to simulate payment webhook events.",
    )
    def post(self, request):
        serializer = WebhookEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event_type = serializer.validated_data["event_type"]
        payment_intent_id = serializer.validated_data["payment_intent_id"]

        try:
            payment = Payment.objects.get(payment_intent_id=payment_intent_id)
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Process webhook event synchronously for admin testing
        if event_type == "payment_intent.succeeded":
            payment.status = Payment.Status.SUCCEEDED
        elif event_type == "payment_intent.failed":
            payment.status = Payment.Status.FAILED

        payment.save()

        return Response(
            {
                "processed": True,
                "payment_status": payment.status,
            }
        )


class PaymentStatusView(APIView):
    """
    Get payment status by payment_intent_id.

    Useful for polling payment status after confirmation.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ConfirmPaymentResponseSerializer},
        tags=["payments"],
        summary="Get payment status",
        description="Get current status of a payment by payment_intent_id.",
    )
    def get(self, request, payment_intent_id):
        try:
            payment = Payment.objects.get(
                payment_intent_id=payment_intent_id,
                user=request.user,
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment not found or access denied"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "status": payment.status,
                "payment_intent_id": payment.payment_intent_id,
            }
        )
