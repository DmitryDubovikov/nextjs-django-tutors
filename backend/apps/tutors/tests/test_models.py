"""
Tests for tutors app models.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError

import pytest

from apps.core.tests.factories import TutorUserFactory
from apps.tutors.models import Tutor

from .factories import MathTutorFactory, TutorFactory, VerifiedTutorFactory


@pytest.mark.django_db
class TestTutorModel:
    """Tests for Tutor model."""

    def test_create_tutor_with_all_fields(self):
        """Tutor can be created with all fields."""
        user = TutorUserFactory()
        tutor = TutorFactory(
            user=user,
            headline="Expert Math Tutor",
            bio="I have 10 years of experience teaching mathematics.",
            hourly_rate=Decimal("50.00"),
            subjects=["math", "physics"],
            is_verified=True,
        )

        assert tutor.user == user
        assert tutor.headline == "Expert Math Tutor"
        assert tutor.bio == "I have 10 years of experience teaching mathematics."
        assert tutor.hourly_rate == Decimal("50.00")
        assert tutor.subjects == ["math", "physics"]
        assert tutor.is_verified is True
        assert tutor.created_at is not None
        assert tutor.updated_at is not None

    def test_tutor_str_returns_full_name(self):
        """__str__ returns tutor's full name."""
        user = TutorUserFactory(first_name="John", last_name="Doe")
        tutor = TutorFactory(user=user)

        assert str(tutor) == "John Doe"

    def test_tutor_str_returns_username_when_no_name(self):
        """__str__ returns username when names are empty."""
        user = TutorUserFactory(first_name="", last_name="", username="johndoe")
        tutor = TutorFactory(user=user)

        assert str(tutor) == "johndoe"

    def test_full_name_property(self):
        """full_name property returns user's full name."""
        user = TutorUserFactory(first_name="Jane", last_name="Smith")
        tutor = TutorFactory(user=user)

        assert tutor.full_name == "Jane Smith"

    def test_avatar_url_property(self):
        """avatar_url property returns user's avatar."""
        user = TutorUserFactory(avatar="https://example.com/avatar.jpg")
        tutor = TutorFactory(user=user)

        assert tutor.avatar_url == "https://example.com/avatar.jpg"

    def test_default_is_verified_is_false(self):
        """Default is_verified is False."""
        tutor = TutorFactory()

        assert tutor.is_verified is False

    def test_verified_tutor_factory(self):
        """VerifiedTutorFactory creates verified tutor."""
        tutor = VerifiedTutorFactory()

        assert tutor.is_verified is True

    def test_subjects_default_is_empty_list(self):
        """subjects field defaults to empty list."""
        user = TutorUserFactory()
        tutor = Tutor.objects.create(
            user=user,
            headline="Test Tutor",
            bio="Test bio",
            hourly_rate=Decimal("30.00"),
        )

        assert tutor.subjects == []

    def test_subjects_can_be_list_of_strings(self):
        """subjects can store list of strings."""
        tutor = TutorFactory(subjects=["math", "physics", "chemistry"])

        assert tutor.subjects == ["math", "physics", "chemistry"]
        assert len(tutor.subjects) == 3

    def test_hourly_rate_cannot_be_negative(self):
        """hourly_rate cannot be negative."""
        user = TutorUserFactory()
        tutor = Tutor(
            user=user,
            headline="Test Tutor",
            bio="Test bio",
            hourly_rate=Decimal("-10.00"),
            subjects=["math"],
        )

        with pytest.raises(ValidationError) as exc_info:
            tutor.full_clean()

        assert "hourly_rate" in exc_info.value.message_dict

    def test_hourly_rate_can_be_zero(self):
        """hourly_rate can be zero."""
        user = TutorUserFactory()
        tutor = Tutor.objects.create(
            user=user,
            headline="Free Tutor",
            bio="I teach for free",
            hourly_rate=Decimal("0.00"),
            subjects=["math"],
        )

        assert tutor.hourly_rate == Decimal("0.00")

    def test_one_to_one_relationship_with_user(self):
        """Tutor has one-to-one relationship with User."""
        user = TutorUserFactory()
        tutor = TutorFactory(user=user)

        assert tutor.user == user
        assert user.tutor_profile == tutor

    def test_tutors_ordered_by_created_at_desc(self):
        """Tutors are ordered by created_at descending by default."""
        tutor1 = TutorFactory()
        tutor2 = TutorFactory()
        tutor3 = TutorFactory()

        tutors = list(Tutor.objects.all())

        assert tutors[0] == tutor3
        assert tutors[1] == tutor2
        assert tutors[2] == tutor1

    def test_create_multiple_tutors(self):
        """Multiple tutors can be created."""
        tutors = TutorFactory.create_batch(5)

        assert len(tutors) == 5
        assert Tutor.objects.count() == 5

    def test_math_tutor_factory(self):
        """MathTutorFactory creates math tutor with correct subjects."""
        tutor = MathTutorFactory()

        assert "math" in tutor.subjects
        assert tutor.hourly_rate == Decimal("50.00")

    def test_cascade_delete_user_deletes_tutor(self):
        """Deleting user cascades to delete tutor profile."""
        user = TutorUserFactory()
        tutor = TutorFactory(user=user)
        tutor_id = tutor.id

        user.delete()

        assert not Tutor.objects.filter(id=tutor_id).exists()
