"""
Admin configuration for tutors app.
"""

from django.contrib import admin

from .models import Tutor


@admin.register(Tutor)
class TutorAdmin(admin.ModelAdmin):
    """Admin configuration for Tutor model."""

    list_display = (
        "id",
        "full_name",
        "headline",
        "hourly_rate",
        "is_verified",
        "created_at",
    )
    list_filter = ("is_verified", "created_at")
    search_fields = ("user__first_name", "user__last_name", "headline", "bio")
    readonly_fields = ("created_at", "updated_at")

    def full_name(self, obj: Tutor) -> str:
        """Display the tutor's full name."""
        return obj.full_name

    full_name.short_description = "Full Name"
