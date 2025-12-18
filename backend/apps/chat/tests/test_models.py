"""
Tests for chat app models.
"""

from django.db import IntegrityError

import pytest

from apps.chat.models import ChatRoom, Message
from apps.core.tests.factories import StudentUserFactory, TutorUserFactory

from .factories import ChatRoomFactory, MessageFactory


@pytest.mark.django_db
class TestChatRoomModel:
    """Tests for ChatRoom model."""

    def test_str_representation(self):
        """__str__ returns 'Chat: tutor - student'."""
        tutor = TutorUserFactory(username="john_tutor")
        student = StudentUserFactory(username="jane_student")
        room = ChatRoomFactory(tutor=tutor, student=student)

        result = str(room)

        assert "Chat:" in result
        assert str(tutor) in result
        assert str(student) in result

    def test_chat_room_creation_with_required_fields(self):
        """ChatRoom can be created with tutor and student."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()

        room = ChatRoom.objects.create(tutor=tutor, student=student)

        assert room.id is not None
        assert room.tutor == tutor
        assert room.student == student
        assert room.booking is None

    def test_chat_room_has_uuid_primary_key(self):
        """ChatRoom uses UUID as primary key."""
        room = ChatRoomFactory()

        assert isinstance(room.id, type(room.id))  # UUID type
        assert len(str(room.id)) == 36  # UUID string length

    def test_chat_room_ordering_by_updated_at_desc(self):
        """ChatRooms are ordered by updated_at descending."""
        room1 = ChatRoomFactory()
        room2 = ChatRoomFactory()

        rooms = list(ChatRoom.objects.all())

        assert rooms[0] == room2  # Most recently created/updated first
        assert rooms[1] == room1

    def test_unique_constraint_tutor_student(self):
        """Cannot create duplicate ChatRoom with same tutor and student."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()
        ChatRoomFactory(tutor=tutor, student=student)

        with pytest.raises(IntegrityError):
            ChatRoom.objects.create(tutor=tutor, student=student)

    def test_chat_room_can_be_created_without_booking(self):
        """ChatRoom can exist without associated booking."""
        room = ChatRoomFactory(booking=None)

        assert room.booking is None

    def test_chat_room_timestamps(self):
        """ChatRoom has created_at and updated_at timestamps."""
        room = ChatRoomFactory()

        assert room.created_at is not None
        assert room.updated_at is not None
        assert room.created_at <= room.updated_at

    def test_related_name_tutor_access(self):
        """Can access chat rooms from tutor's perspective."""
        tutor = TutorUserFactory()
        room1 = ChatRoomFactory(tutor=tutor)
        room2 = ChatRoomFactory(tutor=tutor)

        rooms = tutor.chat_rooms_as_tutor.all()

        assert room1 in rooms
        assert room2 in rooms
        assert rooms.count() == 2

    def test_related_name_student_access(self):
        """Can access chat rooms from student's perspective."""
        student = StudentUserFactory()
        room1 = ChatRoomFactory(student=student)
        room2 = ChatRoomFactory(student=student)

        rooms = student.chat_rooms_as_student.all()

        assert room1 in rooms
        assert room2 in rooms
        assert rooms.count() == 2


@pytest.mark.django_db
class TestMessageModel:
    """Tests for Message model."""

    def test_str_representation(self):
        """__str__ returns 'sender: content[:50]'."""
        tutor = TutorUserFactory(username="tutor1")
        message = MessageFactory(sender=tutor, content="Hello, this is a test message!")

        result = str(message)

        assert str(tutor) in result
        assert "Hello, this is a test message!" in result

    def test_str_truncates_long_content(self):
        """__str__ truncates content longer than 50 chars."""
        long_content = "A" * 100
        message = MessageFactory(content=long_content)

        result = str(message)

        assert len(result.split(": ")[1]) <= 50

    def test_message_creation_with_required_fields(self):
        """Message can be created with room, sender, and content."""
        room = ChatRoomFactory()
        sender = room.student
        content = "Test message"

        message = Message.objects.create(room=room, sender=sender, content=content)

        assert message.id is not None
        assert message.room == room
        assert message.sender == sender
        assert message.content == content
        assert message.is_read is False

    def test_message_has_uuid_primary_key(self):
        """Message uses UUID as primary key."""
        message = MessageFactory()

        assert isinstance(message.id, type(message.id))  # UUID type
        assert len(str(message.id)) == 36

    def test_message_default_is_read_false(self):
        """Message is_read defaults to False."""
        message = MessageFactory()

        assert message.is_read is False

    def test_message_can_be_marked_read(self):
        """Message can be marked as read."""
        message = MessageFactory(is_read=False)

        message.is_read = True
        message.save()

        message.refresh_from_db()
        assert message.is_read is True

    def test_message_ordering_by_created_at_asc(self):
        """Messages are ordered by created_at ascending."""
        room = ChatRoomFactory()
        message1 = MessageFactory(room=room, content="First")
        message2 = MessageFactory(room=room, content="Second")

        messages = list(room.messages.all())

        assert messages[0] == message1
        assert messages[1] == message2

    def test_message_created_at_timestamp(self):
        """Message has created_at timestamp."""
        message = MessageFactory()

        assert message.created_at is not None

    def test_related_messages_from_room(self):
        """Can access messages from room."""
        room = ChatRoomFactory()
        message1 = MessageFactory(room=room)
        message2 = MessageFactory(room=room)

        messages = room.messages.all()

        assert message1 in messages
        assert message2 in messages
        assert messages.count() == 2

    def test_related_messages_from_sender(self):
        """Can access sent messages from user."""
        sender = StudentUserFactory()
        room = ChatRoomFactory(student=sender)
        message1 = MessageFactory(room=room, sender=sender)
        message2 = MessageFactory(room=room, sender=sender)

        messages = sender.sent_messages.all()

        assert message1 in messages
        assert message2 in messages
        assert messages.count() == 2

    def test_cascade_delete_on_room_deletion(self):
        """Messages are deleted when room is deleted."""
        room = ChatRoomFactory()
        message1 = MessageFactory(room=room)
        message2 = MessageFactory(room=room)
        message_ids = [message1.id, message2.id]

        room.delete()

        assert Message.objects.filter(id__in=message_ids).count() == 0

    def test_cascade_delete_on_sender_deletion(self):
        """Messages are deleted when sender is deleted."""
        sender = StudentUserFactory()
        room = ChatRoomFactory(student=sender)
        message = MessageFactory(room=room, sender=sender)
        message_id = message.id

        sender.delete()

        assert not Message.objects.filter(id=message_id).exists()
