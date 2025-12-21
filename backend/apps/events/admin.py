from django.contrib import admin

from .models import OutboxEvent


@admin.register(OutboxEvent)
class OutboxEventAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "aggregate_type",
        "aggregate_id",
        "event_type",
        "created_at",
        "published_at",
    ]
    list_filter = ["aggregate_type", "event_type", "published_at"]
    search_fields = ["aggregate_id", "event_type"]
    readonly_fields = ["id", "created_at", "payload"]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
