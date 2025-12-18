from django.contrib import admin

from .models import ChatRoom, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ["id", "tutor", "student", "created_at", "updated_at"]
    list_filter = ["created_at"]
    search_fields = ["tutor__username", "student__username"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "room", "sender", "content_preview", "is_read", "created_at"]
    list_filter = ["is_read", "created_at"]
    search_fields = ["content", "sender__username"]
    readonly_fields = ["id", "created_at"]

    def content_preview(self, obj: Message) -> str:
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content

    content_preview.short_description = "Content"
