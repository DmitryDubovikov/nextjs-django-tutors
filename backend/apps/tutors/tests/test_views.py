"""
Tests for tutors app views.
"""

from rest_framework import status

import pytest

from .factories import TutorFactory


@pytest.mark.django_db
class TestTutorViewSet:
    """Tests for TutorViewSet."""

    def test_list_returns_all_tutors(self, api_client):
        """GET /api/tutors/ returns list of tutors."""
        TutorFactory.create_batch(3)

        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 3

    def test_list_returns_empty_when_no_tutors(self, api_client):
        """GET /api/tutors/ returns empty list when no tutors exist."""
        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []
        assert response.data["count"] == 0

    def test_list_is_paginated(self, api_client):
        """GET /api/tutors/ returns paginated response."""
        TutorFactory.create_batch(25)

        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK
        assert "count" in response.data
        assert "next" in response.data
        assert "previous" in response.data
        assert "results" in response.data
        assert response.data["count"] == 25
        assert len(response.data["results"]) == 20  # Default page size

    def test_list_second_page(self, api_client):
        """GET /api/tutors/?page=2 returns second page."""
        TutorFactory.create_batch(25)

        response = api_client.get("/api/tutors/?page=2")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 5

    def test_retrieve_returns_tutor(self, api_client):
        """GET /api/tutors/{id}/ returns tutor details."""
        tutor = TutorFactory(headline="Expert Math Tutor")

        response = api_client.get(f"/api/tutors/{tutor.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == tutor.id
        assert response.data["headline"] == "Expert Math Tutor"

    def test_retrieve_returns_404_for_nonexistent(self, api_client):
        """GET /api/tutors/{id}/ returns 404 for nonexistent tutor."""
        response = api_client.get("/api/tutors/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_includes_detail_fields(self, api_client):
        """GET /api/tutors/{id}/ includes detail-only fields."""
        tutor = TutorFactory()

        response = api_client.get(f"/api/tutors/{tutor.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert "email" in response.data
        assert "updated_at" in response.data

    def test_list_does_not_include_detail_fields(self, api_client):
        """GET /api/tutors/ does not include detail-only fields."""
        TutorFactory()

        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK
        tutor_data = response.data["results"][0]
        assert "email" not in tutor_data

    def test_list_does_not_require_authentication(self, api_client):
        """GET /api/tutors/ does not require authentication."""
        TutorFactory()

        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_does_not_require_authentication(self, api_client):
        """GET /api/tutors/{id}/ does not require authentication."""
        tutor = TutorFactory()

        response = api_client.get(f"/api/tutors/{tutor.id}/")

        assert response.status_code == status.HTTP_200_OK

    def test_create_not_allowed(self, api_client):
        """POST /api/tutors/ is not allowed (read-only viewset)."""
        response = api_client.post("/api/tutors/", {})

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_update_not_allowed(self, api_client):
        """PUT /api/tutors/{id}/ is not allowed (read-only viewset)."""
        tutor = TutorFactory()

        response = api_client.put(f"/api/tutors/{tutor.id}/", {})

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_delete_not_allowed(self, api_client):
        """DELETE /api/tutors/{id}/ is not allowed (read-only viewset)."""
        tutor = TutorFactory()

        response = api_client.delete(f"/api/tutors/{tutor.id}/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_list_returns_ordered_by_rating_desc(self, api_client):
        """GET /api/tutors/ returns tutors ordered by rating desc by default."""
        from decimal import Decimal

        tutor1 = TutorFactory(rating=Decimal("3.5"))
        tutor2 = TutorFactory(rating=Decimal("4.5"))
        tutor3 = TutorFactory(rating=Decimal("4.0"))

        response = api_client.get("/api/tutors/")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        # Ordered by rating descending: 4.5, 4.0, 3.5
        assert results[0]["id"] == tutor2.id
        assert results[1]["id"] == tutor3.id
        assert results[2]["id"] == tutor1.id
