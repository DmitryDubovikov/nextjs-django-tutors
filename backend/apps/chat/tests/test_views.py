"""
Tests for chat app views.
"""

from rest_framework import status

import pytest

from apps.chat.models import ChatRoom
from apps.core.tests.factories import StudentUserFactory, TutorUserFactory

from .factories import ChatRoomFactory, MessageFactory


@pytest.mark.django_db
class TestChatRoomViewSet:
    """Tests for ChatRoomViewSet."""

    def test_list_requires_authentication(self, api_client):
        """GET /api/chat/rooms/ requires authentication."""
        response = api_client.get("/api/chat/rooms/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_returns_user_chat_rooms_as_student(self, api_client):
        """GET /api/chat/rooms/ returns rooms where user is student."""
        student = StudentUserFactory()
        room1 = ChatRoomFactory(student=student)
        room2 = ChatRoomFactory(student=student)
        ChatRoomFactory()  # Another room, not related to student

        api_client.force_authenticate(student)
        response = api_client.get("/api/chat/rooms/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
        room_ids = [str(r["id"]) for r in response.data["results"]]
        assert str(room1.id) in room_ids
        assert str(room2.id) in room_ids

    def test_list_returns_user_chat_rooms_as_tutor(self, api_client):
        """GET /api/chat/rooms/ returns rooms where user is tutor."""
        tutor = TutorUserFactory()
        room1 = ChatRoomFactory(tutor=tutor)
        room2 = ChatRoomFactory(tutor=tutor)
        ChatRoomFactory()  # Another room

        api_client.force_authenticate(tutor)
        response = api_client.get("/api/chat/rooms/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
        room_ids = [str(r["id"]) for r in response.data["results"]]
        assert str(room1.id) in room_ids
        assert str(room2.id) in room_ids

    def test_list_returns_empty_for_user_with_no_rooms(self, api_client):
        """GET /api/chat/rooms/ returns empty list if user has no rooms."""
        student = StudentUserFactory()
        ChatRoomFactory()  # Room not related to student

        api_client.force_authenticate(student)
        response = api_client.get("/api/chat/rooms/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_retrieve_requires_authentication(self, api_client):
        """GET /api/chat/rooms/{id}/ requires authentication."""
        room = ChatRoomFactory()

        response = api_client.get(f"/api/chat/rooms/{room.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_returns_chat_room_details(self, api_client):
        """GET /api/chat/rooms/{id}/ returns room details."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert str(response.data["id"]) == str(room.id)
        assert response.data["tutor"]["id"] == room.tutor.id
        assert response.data["student"]["id"] == student.id

    def test_retrieve_returns_404_for_unauthorized_user(self, api_client):
        """GET /api/chat/rooms/{id}/ returns 404 if user not in room."""
        room = ChatRoomFactory()
        other_student = StudentUserFactory()

        api_client.force_authenticate(other_student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_requires_authentication(self, api_client):
        """POST /api/chat/rooms/ requires authentication."""
        tutor = TutorUserFactory()

        response = api_client.post("/api/chat/rooms/", {"tutor_id": tutor.id})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_chat_room_with_tutor(self, api_client):
        """POST /api/chat/rooms/ creates new chat room."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()

        api_client.force_authenticate(student)
        response = api_client.post("/api/chat/rooms/", {"tutor_id": tutor.id}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert str(response.data["tutor"]["id"]) == str(tutor.id)
        assert str(response.data["student"]["id"]) == str(student.id)

        # Verify room was created in database
        room = ChatRoom.objects.get(id=response.data["id"])
        assert room.tutor == tutor
        assert room.student == student

    def test_create_returns_existing_chat_room(self, api_client):
        """POST /api/chat/rooms/ returns existing room if already exists."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()
        existing_room = ChatRoomFactory(tutor=tutor, student=student)

        api_client.force_authenticate(student)
        response = api_client.post("/api/chat/rooms/", {"tutor_id": tutor.id}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert str(response.data["id"]) == str(existing_room.id)

        # Verify no duplicate was created
        assert ChatRoom.objects.filter(tutor=tutor, student=student).count() == 1

    def test_create_with_invalid_tutor_id(self, api_client):
        """POST /api/chat/rooms/ returns 400 for invalid tutor_id."""
        student = StudentUserFactory()

        api_client.force_authenticate(student)
        response = api_client.post("/api/chat/rooms/", {"tutor_id": 99999}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tutor_id" in response.data

    def test_create_with_non_tutor_user(self, api_client):
        """POST /api/chat/rooms/ returns 400 if user_id is not a tutor."""
        student1 = StudentUserFactory()
        student2 = StudentUserFactory()

        api_client.force_authenticate(student1)
        response = api_client.post("/api/chat/rooms/", {"tutor_id": student2.id}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_not_allowed(self, api_client):
        """PUT/PATCH /api/chat/rooms/{id}/ not allowed."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)

        api_client.force_authenticate(student)
        response_put = api_client.put(f"/api/chat/rooms/{room.id}/", {})
        response_patch = api_client.patch(f"/api/chat/rooms/{room.id}/", {})

        assert response_put.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert response_patch.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_delete_not_allowed(self, api_client):
        """DELETE /api/chat/rooms/{id}/ not allowed."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.delete(f"/api/chat/rooms/{room.id}/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


@pytest.mark.django_db
class TestChatRoomMessagesAction:
    """Tests for ChatRoomViewSet.messages action."""

    def test_messages_requires_authentication(self, api_client):
        """GET /api/chat/rooms/{id}/messages/ requires authentication."""
        room = ChatRoomFactory()

        response = api_client.get(f"/api/chat/rooms/{room.id}/messages/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_messages_returns_room_messages(self, api_client):
        """GET /api/chat/rooms/{id}/messages/ returns messages."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)
        MessageFactory(room=room, content="First")
        MessageFactory(room=room, content="Second")
        MessageFactory()  # Message in different room

        api_client.force_authenticate(student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/messages/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
        assert response.data["results"][0]["content"] == "First"
        assert response.data["results"][1]["content"] == "Second"

    def test_messages_ordered_by_created_at(self, api_client):
        """Messages are ordered by created_at ascending."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)
        message1 = MessageFactory(room=room, content="First")
        message2 = MessageFactory(room=room, content="Second")

        api_client.force_authenticate(student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/messages/")

        assert response.status_code == status.HTTP_200_OK
        message_ids = [m["id"] for m in response.data["results"]]
        assert str(message1.id) == message_ids[0]
        assert str(message2.id) == message_ids[1]

    def test_messages_returns_404_for_unauthorized_user(self, api_client):
        """GET /api/chat/rooms/{id}/messages/ returns 404 if user not in room."""
        room = ChatRoomFactory()
        other_student = StudentUserFactory()

        api_client.force_authenticate(other_student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/messages/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_messages_pagination(self, api_client):
        """Messages endpoint supports pagination."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)
        MessageFactory.create_batch(25, room=room)

        api_client.force_authenticate(student)
        response = api_client.get(f"/api/chat/rooms/{room.id}/messages/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert "count" in response.data
        assert "next" in response.data
        assert "previous" in response.data


@pytest.mark.django_db
class TestChatRoomMarkReadAction:
    """Tests for ChatRoomViewSet.mark_read action."""

    def test_mark_read_requires_authentication(self, api_client):
        """POST /api/chat/rooms/{id}/mark_read/ requires authentication."""
        room = ChatRoomFactory()

        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_read_marks_unread_messages_as_read(self, api_client):
        """POST /api/chat/rooms/{id}/mark_read/ marks messages as read."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()
        room = ChatRoomFactory(tutor=tutor, student=student)

        # Messages from tutor to student (unread)
        message1 = MessageFactory(room=room, sender=tutor, is_read=False)
        message2 = MessageFactory(room=room, sender=tutor, is_read=False)
        # Message from student (should not be marked)
        message3 = MessageFactory(room=room, sender=student, is_read=False)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] == 2

        # Verify messages were marked as read
        message1.refresh_from_db()
        message2.refresh_from_db()
        message3.refresh_from_db()

        assert message1.is_read is True
        assert message2.is_read is True
        assert message3.is_read is False  # Own message not marked

    def test_mark_read_excludes_own_messages(self, api_client):
        """mark_read does not mark user's own messages."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)
        MessageFactory.create_batch(3, room=room, sender=student, is_read=False)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] == 0

    def test_mark_read_excludes_already_read_messages(self, api_client):
        """mark_read does not affect already read messages."""
        tutor = TutorUserFactory()
        student = StudentUserFactory()
        room = ChatRoomFactory(tutor=tutor, student=student)

        MessageFactory(room=room, sender=tutor, is_read=True)
        MessageFactory(room=room, sender=tutor, is_read=False)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] == 1

    def test_mark_read_returns_404_for_unauthorized_user(self, api_client):
        """POST /api/chat/rooms/{id}/mark_read/ returns 404 if user not in room."""
        room = ChatRoomFactory()
        other_student = StudentUserFactory()

        api_client.force_authenticate(other_student)
        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_read_returns_zero_if_no_unread_messages(self, api_client):
        """mark_read returns 0 if all messages already read."""
        student = StudentUserFactory()
        room = ChatRoomFactory(student=student)

        api_client.force_authenticate(student)
        response = api_client.post(f"/api/chat/rooms/{room.id}/mark_read/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] == 0
