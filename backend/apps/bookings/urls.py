"""
URL configuration for bookings app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminBookingViewSet, BookingViewSet

router = DefaultRouter()
router.register(r"bookings", BookingViewSet, basename="booking")

admin_router = DefaultRouter()
admin_router.register(r"bookings", AdminBookingViewSet, basename="admin-booking")

urlpatterns = [
    path("", include(router.urls)),
    path("admin/", include(admin_router.urls)),
]
