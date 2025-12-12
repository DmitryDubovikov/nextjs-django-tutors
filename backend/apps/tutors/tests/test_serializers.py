"""
Tests for tutors app serializers.
"""

from decimal import Decimal

import pytest

from apps.core.tests.factories import TutorUserFactory
from apps.tutors.serializers import TutorDetailSerializer, TutorSerializer

from .factories import TutorFactory, VerifiedTutorFactory


@pytest.mark.django_db
class TestTutorSerializer:
    """Tests for TutorSerializer."""

    def test_serialize_tutor(self):
        """TutorSerializer correctly serializes tutor data."""
        user = TutorUserFactory(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            avatar="https://example.com/avatar.jpg",
        )
        tutor = TutorFactory(
            user=user,
            headline="Expert Math Tutor",
            bio="I teach mathematics.",
            hourly_rate=Decimal("50.00"),
            subjects=["math", "physics"],
            is_verified=True,
        )

        serializer = TutorSerializer(tutor)
        data = serializer.data

        assert data["id"] == tutor.id
        assert data["full_name"] == "John Doe"
        assert data["avatar_url"] == "https://example.com/avatar.jpg"
        assert data["headline"] == "Expert Math Tutor"
        assert data["bio"] == "I teach mathematics."
        assert data["hourly_rate"] == "50.00"
        assert data["subjects"] == ["math", "physics"]
        assert data["is_verified"] is True
        assert "created_at" in data

    def test_serialize_tutor_with_empty_avatar(self):
        """TutorSerializer handles empty avatar."""
        user = TutorUserFactory(avatar="")
        tutor = TutorFactory(user=user)

        serializer = TutorSerializer(tutor)
        data = serializer.data

        assert data["avatar_url"] == ""

    def test_serialize_multiple_tutors(self):
        """TutorSerializer can serialize multiple tutors."""
        tutors = TutorFactory.create_batch(3)

        serializer = TutorSerializer(tutors, many=True)
        data = serializer.data

        assert len(data) == 3

    def test_serialize_verified_tutor(self):
        """TutorSerializer correctly shows verified status."""
        tutor = VerifiedTutorFactory()

        serializer = TutorSerializer(tutor)
        data = serializer.data

        assert data["is_verified"] is True

    def test_serialize_unverified_tutor(self):
        """TutorSerializer correctly shows unverified status."""
        tutor = TutorFactory(is_verified=False)

        serializer = TutorSerializer(tutor)
        data = serializer.data

        assert data["is_verified"] is False

    def test_full_name_method_field(self):
        """full_name is correctly computed from user names."""
        user = TutorUserFactory(first_name="Jane", last_name="Smith")
        tutor = TutorFactory(user=user)

        serializer = TutorSerializer(tutor)
        data = serializer.data

        assert data["full_name"] == "Jane Smith"


@pytest.mark.django_db
class TestTutorDetailSerializer:
    """Tests for TutorDetailSerializer."""

    def test_detail_serializer_includes_all_fields(self):
        """TutorDetailSerializer includes all base fields plus detail fields."""
        user = TutorUserFactory(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
        )
        tutor = TutorFactory(user=user)

        serializer = TutorDetailSerializer(tutor)
        data = serializer.data

        # Base fields
        assert "id" in data
        assert "full_name" in data
        assert "avatar_url" in data
        assert "headline" in data
        assert "bio" in data
        assert "hourly_rate" in data
        assert "subjects" in data
        assert "is_verified" in data
        assert "created_at" in data

        # Detail fields
        assert "email" in data
        assert "updated_at" in data

    def test_detail_serializer_includes_email(self):
        """TutorDetailSerializer includes user's email."""
        user = TutorUserFactory(email="test@example.com")
        tutor = TutorFactory(user=user)

        serializer = TutorDetailSerializer(tutor)
        data = serializer.data

        assert data["email"] == "test@example.com"

    def test_detail_serializer_includes_updated_at(self):
        """TutorDetailSerializer includes updated_at field."""
        tutor = TutorFactory()

        serializer = TutorDetailSerializer(tutor)
        data = serializer.data

        assert "updated_at" in data
        assert data["updated_at"] is not None
