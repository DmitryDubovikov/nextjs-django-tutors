"""
URL configuration for payments app.
"""

from django.urls import path

from apps.payments.views import (
    ConfirmPaymentView,
    CreatePaymentIntentView,
    PaymentStatusView,
    WebhookSimulatorView,
)

urlpatterns = [
    path(
        "payments/create-intent/",
        CreatePaymentIntentView.as_view(),
        name="create-payment-intent",
    ),
    path(
        "payments/confirm/",
        ConfirmPaymentView.as_view(),
        name="confirm-payment",
    ),
    path(
        "payments/status/<str:payment_intent_id>/",
        PaymentStatusView.as_view(),
        name="payment-status",
    ),
    path(
        "payments/webhook-simulator/",
        WebhookSimulatorView.as_view(),
        name="webhook-simulator",
    ),
]
