"""
Serializers for chat API.
"""

from rest_framework import serializers

from apps.core.models import User

from .models import ChatRoom, Message


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "avatar"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "room", "sender", "content", "is_read", "created_at"]
        read_only_fields = ["id", "room", "sender", "is_read", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    tutor = UserSerializer(read_only=True)
    student = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "tutor",
            "student",
            "booking",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message(self, obj: ChatRoom) -> dict | None:
        # Use prefetched data if available (from ChatRoomViewSet.get_queryset)
        last_message_list = getattr(obj, "last_message_list", None)
        if last_message_list is not None:
            last_msg = last_message_list[0] if last_message_list else None
        else:
            # Fallback for cases where prefetch isn't used (e.g., after create)
            last_msg = obj.messages.order_by("-created_at").first()

        if last_msg:
            return {
                "id": str(last_msg.id),
                "content": last_msg.content[:100],
                "sender_id": str(last_msg.sender_id),
                "created_at": last_msg.created_at.isoformat(),
            }
        return None

    def get_unread_count(self, obj: ChatRoom) -> int:
        # Use annotated data if available (from ChatRoomViewSet.get_queryset)
        annotated_count = getattr(obj, "unread_count_annotated", None)
        if annotated_count is not None:
            return annotated_count

        # Fallback for cases where annotation isn't used (e.g., after create)
        user = self.context.get("request").user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()


class CreateChatRoomSerializer(serializers.Serializer):
    tutor_id = serializers.IntegerField()

    def validate_tutor_id(self, value):
        from apps.core.models import User

        if not User.objects.filter(id=value, user_type="tutor").exists():
            raise serializers.ValidationError("Tutor not found") from None
        return value

    def create(self, validated_data):
        student = self.context["request"].user
        tutor_id = validated_data["tutor_id"]

        room, _created = ChatRoom.objects.get_or_create(
            tutor_id=tutor_id,
            student=student,
        )
        return room
