"""
Tests for TutorDraft model and views.
"""

from django.db import IntegrityError
from rest_framework import status

import pytest

from apps.core.tests.factories import UserFactory

from ..models import TutorDraft


@pytest.mark.django_db
class TestTutorDraftModel:
    """Tests for TutorDraft model."""

    def test_create_draft(self):
        """Test creating a draft with valid data."""
        user = UserFactory()
        draft = TutorDraft.objects.create(
            user=user,
            data={"firstName": "John", "lastName": "Doe"},
            current_step=1,
        )

        assert draft.id is not None
        assert draft.user == user
        assert draft.data["firstName"] == "John"
        assert draft.current_step == 1

    def test_str_representation(self):
        """Test string representation of draft."""
        user = UserFactory(first_name="John", last_name="Doe")
        draft = TutorDraft.objects.create(user=user, data={})

        assert "John Doe" in str(draft) or "Draft for" in str(draft)

    def test_one_draft_per_user(self):
        """Test that each user can only have one draft."""
        user = UserFactory()
        TutorDraft.objects.create(user=user, data={})

        with pytest.raises(IntegrityError):
            TutorDraft.objects.create(user=user, data={})

    def test_draft_timestamps(self):
        """Test that timestamps are set correctly."""
        user = UserFactory()
        draft = TutorDraft.objects.create(user=user, data={})

        assert draft.created_at is not None
        assert draft.updated_at is not None

    def test_default_values(self):
        """Test default values for draft."""
        user = UserFactory()
        draft = TutorDraft.objects.create(user=user)

        assert draft.data == {}
        assert draft.current_step == 0


@pytest.mark.django_db
class TestTutorDraftViewSet:
    """Tests for TutorDraftViewSet."""

    def test_list_draft_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access drafts."""
        response = api_client.get("/api/tutor-drafts/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_draft_authenticated_no_draft(self, api_client):
        """Test listing drafts when user has no draft."""
        user = UserFactory()
        api_client.force_authenticate(user)

        response = api_client.get("/api/tutor-drafts/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_draft_authenticated_with_draft(self, api_client):
        """Test listing drafts when user has a draft."""
        user = UserFactory()
        TutorDraft.objects.create(
            user=user,
            data={"firstName": "John"},
            current_step=2,
        )
        api_client.force_authenticate(user)

        response = api_client.get("/api/tutor-drafts/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["firstName"] == "John"
        assert response.data["current_step"] == 2

    def test_create_draft_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create drafts."""
        data = {
            "data": {"firstName": "John"},
            "current_step": 1,
        }

        response = api_client.post("/api/tutor-drafts/", data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_draft_authenticated(self, api_client):
        """Test creating a draft for authenticated user."""
        user = UserFactory()
        api_client.force_authenticate(user)
        data = {
            "data": {"firstName": "John", "lastName": "Doe"},
            "current_step": 1,
        }

        response = api_client.post("/api/tutor-drafts/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["data"]["firstName"] == "John"
        assert response.data["current_step"] == 1
        assert TutorDraft.objects.filter(user=user).exists()

    def test_create_draft_updates_existing(self, api_client):
        """Test that creating a draft updates existing draft."""
        user = UserFactory()
        TutorDraft.objects.create(
            user=user,
            data={"firstName": "Old"},
            current_step=0,
        )
        api_client.force_authenticate(user)
        data = {
            "data": {"firstName": "New"},
            "current_step": 3,
        }

        response = api_client.post("/api/tutor-drafts/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["data"]["firstName"] == "New"
        assert response.data["current_step"] == 3
        assert TutorDraft.objects.filter(user=user).count() == 1

    def test_clear_draft(self, api_client):
        """Test clearing a draft."""
        user = UserFactory()
        TutorDraft.objects.create(user=user, data={})
        api_client.force_authenticate(user)

        response = api_client.delete("/api/tutor-drafts/clear/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not TutorDraft.objects.filter(user=user).exists()

    def test_clear_draft_no_draft(self, api_client):
        """Test clearing when no draft exists."""
        user = UserFactory()
        api_client.force_authenticate(user)

        response = api_client.delete("/api/tutor-drafts/clear/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_cannot_see_other_drafts(self, api_client):
        """Test that users cannot see other users' drafts."""
        user1 = UserFactory()
        user2 = UserFactory()
        TutorDraft.objects.create(user=user1, data={"secret": "data"})
        api_client.force_authenticate(user2)

        response = api_client.get("/api/tutor-drafts/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_draft_with_complex_data(self, api_client):
        """Test draft with complex nested data structure."""
        user = UserFactory()
        api_client.force_authenticate(user)
        complex_data = {
            "data": {
                "firstName": "John",
                "lastName": "Doe",
                "subjects": [
                    {"name": "Math", "level": "expert", "hourlyRate": 2000},
                    {"name": "Physics", "level": "advanced", "hourlyRate": 1800},
                ],
                "availableSlots": [
                    {"day": "monday", "startTime": "09:00", "endTime": "18:00"},
                ],
            },
            "current_step": 4,
        }

        response = api_client.post("/api/tutor-drafts/", complex_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data["data"]["subjects"]) == 2
        assert response.data["data"]["subjects"][0]["name"] == "Math"
