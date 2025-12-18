"""
Chat models for real-time messaging between tutors and students.
"""

import uuid

from django.conf import settings
from django.db import models


class ChatRoom(models.Model):
    """
    Chat room between a tutor and a student.
    Each booking can have an associated chat room.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_rooms_as_tutor",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_rooms_as_student",
    )
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="chat_room",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_rooms"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tutor", "student"],
                name="unique_tutor_student_chat",
            ),
        ]

    def __str__(self) -> str:
        return f"Chat: {self.tutor} - {self.student}"


class Message(models.Model):
    """
    A message in a chat room.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.sender}: {self.content[:50]}"
