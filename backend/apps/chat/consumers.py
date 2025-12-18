"""
WebSocket consumers for real-time chat functionality.
"""

import uuid

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import ChatRoom, Message


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for chat rooms.

    Handles:
    - Connection/disconnection
    - Sending/receiving messages
    - Typing indicators
    - Message read receipts
    """

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope.get("user")

        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)
            return

        room = await self.get_room()
        if not room:
            await self.close(code=4004)
            return

        if not await self.user_has_access(room):
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        messages = await self.get_message_history()
        await self.send_json({"type": "message_history", "messages": messages})

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        message_type = content.get("type")

        if message_type == "message":
            await self.handle_message(content)
        elif message_type == "typing":
            await self.handle_typing(content)
        elif message_type == "read":
            await self.handle_read(content)
        elif message_type == "read_batch":
            await self.handle_read_batch(content)

    async def handle_message(self, content):
        text = content.get("content", "").strip()
        if not text:
            return

        message = await self.save_message(text)
        message_data = await self.serialize_message(message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_data,
            },
        )

    async def handle_typing(self, content):
        is_typing = content.get("is_typing", False)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "username": self.user.username,
                "is_typing": is_typing,
            },
        )

    async def handle_read(self, content):
        message_id = content.get("message_id")
        if message_id:
            await self.mark_message_read(message_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "message_read",
                    "message_id": message_id,
                    "reader_id": str(self.user.id),
                },
            )

    async def handle_read_batch(self, content):
        """Handle batch read receipts."""
        message_ids = content.get("message_ids", [])
        if message_ids:
            count = await self.mark_messages_read_batch(message_ids)
            if count > 0:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "messages_read_batch",
                        "message_ids": message_ids,
                        "reader_id": str(self.user.id),
                    },
                )

    async def chat_message(self, event):
        await self.send_json(
            {
                "type": "message",
                "message": event["message"],
            }
        )

    async def typing_indicator(self, event):
        if str(self.user.id) != event["user_id"]:
            await self.send_json(
                {
                    "type": "typing",
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "is_typing": event["is_typing"],
                }
            )

    async def message_read(self, event):
        await self.send_json(
            {
                "type": "read",
                "message_id": event["message_id"],
                "reader_id": event["reader_id"],
            }
        )

    async def messages_read_batch(self, event):
        """Send batch read confirmation to client."""
        await self.send_json(
            {
                "type": "read_batch",
                "message_ids": event["message_ids"],
                "reader_id": event["reader_id"],
            }
        )

    @database_sync_to_async
    def get_room(self) -> ChatRoom | None:
        try:
            return ChatRoom.objects.get(id=self.room_id)
        except ChatRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def user_has_access(self, room: ChatRoom) -> bool:
        return self.user.id in (room.tutor_id, room.student_id)

    @database_sync_to_async
    def save_message(self, content: str) -> Message:
        room = ChatRoom.objects.get(id=self.room_id)
        return Message.objects.create(
            room=room,
            sender=self.user,
            content=content,
        )

    @database_sync_to_async
    def serialize_message(self, message: Message) -> dict:
        return {
            "id": str(message.id),
            "room_id": str(message.room_id),
            "sender_id": str(message.sender_id),
            "sender_name": str(message.sender),
            "content": message.content,
            "is_read": message.is_read,
            "created_at": message.created_at.isoformat(),
        }

    @database_sync_to_async
    def get_message_history(self, limit: int = 50) -> list[dict]:
        messages = Message.objects.filter(room_id=self.room_id).order_by("-created_at")[:limit]
        return [
            {
                "id": str(msg.id),
                "room_id": str(msg.room_id),
                "sender_id": str(msg.sender_id),
                "sender_name": str(msg.sender),
                "content": msg.content,
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in reversed(messages)
        ]

    @database_sync_to_async
    def mark_message_read(self, message_id: str) -> None:
        # Skip temporary IDs (e.g., "temp-1234567890")
        try:
            uuid.UUID(message_id)
        except ValueError:
            return

        Message.objects.filter(id=message_id, room_id=self.room_id).exclude(
            sender=self.user
        ).update(is_read=True)

    @database_sync_to_async
    def mark_messages_read_batch(self, message_ids: list[str]) -> int:
        """Mark multiple messages as read in a single query."""
        valid_ids = []
        for mid in message_ids:
            try:
                uuid.UUID(mid)
                valid_ids.append(mid)
            except ValueError:
                continue

        if not valid_ids:
            return 0

        return (
            Message.objects.filter(id__in=valid_ids, room_id=self.room_id)
            .exclude(sender=self.user)
            .update(is_read=True)
        )
