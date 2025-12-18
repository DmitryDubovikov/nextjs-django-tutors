"""
Tests for chat app serializers.
"""

from rest_framework.test import APIRequestFactory

import pytest

from apps.chat.serializers import (
    ChatRoomSerializer,
    CreateChatRoomSerializer,
    MessageSerializer,
    UserSerializer,
)
from apps.core.tests.factories import StudentUserFactory, TutorUserFactory

from .factories import ChatRoomFactory, MessageFactory


@pytest.mark.django_db
class TestUserSerializer:
    """Tests for UserSerializer."""

    def test_serialize_user(self):
        """Serializes user with id, username, first_name, last_name, avatar."""
        user = StudentUserFactory(
            username="john",
            first_name="John",
            last_name="Doe",
            avatar="https://example.com/avatar.jpg",
        )

        serializer = UserSerializer(user)

        assert serializer.data["id"] == user.id
        assert serializer.data["username"] == "john"
        assert serializer.data["first_name"] == "John"
        assert serializer.data["last_name"] == "Doe"
        assert serializer.data["avatar"] == "https://example.com/avatar.jpg"

    def test_serialize_user_without_avatar(self):
        """Serializes user with empty avatar."""
        user = StudentUserFactory(avatar="")

        serializer = UserSerializer(user)

        assert serializer.data["avatar"] == ""


@pytest.mark.django_db
class TestMessageSerializer:
    """Tests for MessageSerializer."""

    def test_serialize_message(self):
        """Serializes message with all fields."""
        message = MessageFactory(content="Hello, world!", is_read=False)

        serializer = MessageSerializer(message)
        data = serializer.data

        assert str(data["id"]) == str(message.id)
        assert str(data["room"]) == str(message.room.id)
        assert data["sender"]["id"] == message.sender.id
        assert data["sender"]["username"] == message.sender.username
        assert data["content"] == "Hello, world!"
        assert data["is_read"] is False
        assert "created_at" in data

    def test_serialize_read_message(self):
        """Serializes read message."""
        message = MessageFactory(is_read=True)

        serializer = MessageSerializer(message)

        assert serializer.data["is_read"] is True

    def test_read_only_fields(self):
        """id, room, sender, is_read, created_at are read-only."""
        message = MessageFactory()
        serializer = MessageSerializer(message)

        read_only_fields = serializer.Meta.read_only_fields

        assert "id" in read_only_fields
        assert "room" in read_only_fields
        assert "sender" in read_only_fields
        assert "is_read" in read_only_fields
        assert "created_at" in read_only_fields


@pytest.mark.django_db
class TestChatRoomSerializer:
    """Tests for ChatRoomSerializer."""

    def test_serialize_chat_room(self):
        """Serializes chat room with all fields."""
        room = ChatRoomFactory()

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = room.student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert str(data["id"]) == str(room.id)
        assert data["tutor"]["id"] == room.tutor.id
        assert data["student"]["id"] == room.student.id
        assert data["booking"] is None
        assert "created_at" in data
        assert "updated_at" in data

    def test_serialize_last_message(self):
        """Includes last_message if messages exist."""
        room = ChatRoomFactory()
        MessageFactory(room=room, content="First message")  # First message, not used
        message2 = MessageFactory(room=room, content="Last message")

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = room.student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert data["last_message"] is not None
        assert str(data["last_message"]["id"]) == str(message2.id)
        assert data["last_message"]["content"] == "Last message"
        assert str(data["last_message"]["sender_id"]) == str(message2.sender_id)
        assert "created_at" in data["last_message"]

    def test_serialize_last_message_truncated(self):
        """last_message content is truncated to 100 chars."""
        room = ChatRoomFactory()
        long_content = "A" * 150
        MessageFactory(room=room, content=long_content)

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = room.student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert len(data["last_message"]["content"]) == 100

    def test_serialize_no_messages(self):
        """last_message is None if no messages."""
        room = ChatRoomFactory()

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = room.student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert data["last_message"] is None

    def test_unread_count_for_student(self):
        """unread_count shows messages not sent by current user."""
        room = ChatRoomFactory()
        tutor = room.tutor
        student = room.student

        MessageFactory(room=room, sender=tutor, is_read=False)
        MessageFactory(room=room, sender=tutor, is_read=False)
        MessageFactory(room=room, sender=student, is_read=False)  # Own message

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert data["unread_count"] == 2  # Only messages from tutor

    def test_unread_count_excludes_read_messages(self):
        """unread_count excludes read messages."""
        room = ChatRoomFactory()
        tutor = room.tutor
        student = room.student

        MessageFactory(room=room, sender=tutor, is_read=True)
        MessageFactory(room=room, sender=tutor, is_read=False)

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = student

        serializer = ChatRoomSerializer(room, context={"request": request})
        data = serializer.data

        assert data["unread_count"] == 1

    def test_read_only_fields(self):
        """id, created_at, updated_at are read-only."""
        serializer = ChatRoomSerializer()

        read_only_fields = serializer.Meta.read_only_fields

        assert "id" in read_only_fields
        assert "created_at" in read_only_fields
        assert "updated_at" in read_only_fields


@pytest.mark.django_db
class TestCreateChatRoomSerializer:
    """Tests for CreateChatRoomSerializer."""

    def test_validate_tutor_id_exists(self):
        """Validates that tutor_id exists and is a tutor."""
        tutor = TutorUserFactory()

        serializer = CreateChatRoomSerializer(data={"tutor_id": tutor.id})

        assert serializer.is_valid()

    def test_validate_tutor_id_not_found(self):
        """Raises validation error if tutor_id doesn't exist."""
        serializer = CreateChatRoomSerializer(data={"tutor_id": 99999})

        assert not serializer.is_valid()
        assert "tutor_id" in serializer.errors
        assert "Tutor not found" in str(serializer.errors["tutor_id"])

    def test_validate_tutor_id_not_a_tutor(self):
        """Raises validation error if user is not a tutor."""
        student = StudentUserFactory()

        serializer = CreateChatRoomSerializer(data={"tutor_id": student.id})

        assert not serializer.is_valid()
        assert "tutor_id" in serializer.errors

    def test_create_new_chat_room(self):
        """Creates a new chat room with tutor and student."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()

        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = student

        serializer = CreateChatRoomSerializer(
            data={"tutor_id": tutor.id}, context={"request": request}
        )
        assert serializer.is_valid()

        room = serializer.save()

        assert room.tutor == tutor
        assert room.student == student

    def test_get_or_create_existing_chat_room(self):
        """Returns existing chat room if already exists."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()
        existing_room = ChatRoomFactory(tutor=tutor, student=student)

        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = student

        serializer = CreateChatRoomSerializer(
            data={"tutor_id": tutor.id}, context={"request": request}
        )
        assert serializer.is_valid()

        room = serializer.save()

        assert room.id == existing_room.id

    def test_create_requires_request_context(self):
        """Create method requires request in context."""
        tutor = TutorUserFactory()

        serializer = CreateChatRoomSerializer(data={"tutor_id": tutor.id})
        assert serializer.is_valid()

        with pytest.raises(KeyError):
            serializer.save()
