"""
Admin configuration for bookings app.
"""

from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Admin interface for Booking model."""

    list_display = ["id", "student", "tutor", "scheduled_at", "status", "price", "created_at"]
    list_filter = ["status", "created_at", "scheduled_at"]
    search_fields = ["student__email", "tutor__user__email"]
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]
