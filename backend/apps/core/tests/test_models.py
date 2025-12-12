"""
Tests for core app models.
"""

import pytest

from apps.core.models import User

from .factories import StudentUserFactory, TutorUserFactory, UserFactory


@pytest.mark.django_db
class TestUserModel:
    """Tests for User model."""

    def test_create_user_with_all_fields(self):
        """User can be created with all fields."""
        user = UserFactory(
            username="johndoe",
            email="john@example.com",
            first_name="John",
            last_name="Doe",
            user_type=User.UserType.TUTOR,
            avatar="https://example.com/avatar.jpg",
            phone="+1234567890",
        )

        assert user.username == "johndoe"
        assert user.email == "john@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.user_type == User.UserType.TUTOR
        assert user.avatar == "https://example.com/avatar.jpg"
        assert user.phone == "+1234567890"
        assert user.is_active is True

    def test_user_str_with_full_name(self):
        """__str__ returns full name when first and last names are set."""
        user = UserFactory(first_name="John", last_name="Doe")

        assert str(user) == "John Doe"

    def test_user_str_with_first_name_only(self):
        """__str__ returns first name when last name is empty."""
        user = UserFactory(first_name="John", last_name="")

        assert str(user) == "John"

    def test_user_str_with_no_names(self):
        """__str__ returns username when names are empty."""
        user = UserFactory(first_name="", last_name="", username="johndoe")

        assert str(user) == "johndoe"

    def test_default_user_type_is_student(self):
        """Default user_type is STUDENT."""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

        assert user.user_type == User.UserType.STUDENT

    def test_user_type_choices(self):
        """User type has correct choices."""
        assert User.UserType.STUDENT == "student"
        assert User.UserType.TUTOR == "tutor"
        assert len(User.UserType.choices) == 2

    def test_avatar_can_be_blank(self):
        """Avatar field can be blank."""
        user = UserFactory(avatar="")

        assert user.avatar == ""

    def test_phone_can_be_blank(self):
        """Phone field can be blank."""
        user = UserFactory(phone="")

        assert user.phone == ""

    def test_tutor_user_factory(self):
        """TutorUserFactory creates user with TUTOR type."""
        user = TutorUserFactory()

        assert user.user_type == User.UserType.TUTOR

    def test_student_user_factory(self):
        """StudentUserFactory creates user with STUDENT type."""
        user = StudentUserFactory()

        assert user.user_type == User.UserType.STUDENT

    def test_create_multiple_users_with_unique_usernames(self):
        """Multiple users can be created with unique usernames."""
        users = UserFactory.create_batch(5)

        assert len(users) == 5
        usernames = [user.username for user in users]
        assert len(set(usernames)) == 5  # All unique

    def test_user_email_format(self):
        """User email follows correct format."""
        user = UserFactory()

        assert "@" in user.email
        assert user.email.endswith("@example.com")
