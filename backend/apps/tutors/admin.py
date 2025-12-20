"""
Admin configuration for tutors app.
"""

from django.conf import settings
from django.contrib import admin, messages

import requests

from .models import Tutor
from .serializers import TutorSearchSerializer


@admin.register(Tutor)
class TutorAdmin(admin.ModelAdmin):
    """Admin configuration for Tutor model."""

    list_display = (
        "id",
        "full_name",
        "headline",
        "hourly_rate",
        "is_verified",
        "rating",
        "created_at",
    )
    list_filter = ("is_verified", "created_at")
    search_fields = ("user__first_name", "user__last_name", "headline", "bio")
    readonly_fields = ("created_at", "updated_at")
    actions = ["sync_to_search"]

    def full_name(self, obj: Tutor) -> str:
        """Display the tutor's full name."""
        return obj.full_name

    full_name.short_description = "Full Name"

    @admin.action(description="Sync selected tutors to Search Service")
    def sync_to_search(self, request, queryset):
        data = TutorSearchSerializer(queryset, many=True).data
        try:
            response = requests.post(
                f"{settings.SEARCH_SERVICE_URL}/admin/sync",
                json=data,
                timeout=30,
            )
            if response.ok:
                result = response.json()
                self.message_user(
                    request,
                    f"Synced {result['synced']} of {result['total']} tutors",
                    messages.SUCCESS,
                )
            else:
                self.message_user(
                    request,
                    f"Sync failed: {response.text}",
                    messages.ERROR,
                )
        except requests.RequestException as e:
            self.message_user(
                request,
                f"Sync error: {e}",
                messages.ERROR,
            )
