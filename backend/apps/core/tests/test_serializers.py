"""
Tests for core app serializers.

Tests authentication serializers for Google/GitHub OAuth and JWT tokens.
"""

import pytest

from apps.core.serializers import (
    GitHubAuthSerializer,
    GoogleAuthSerializer,
    LogoutSerializer,
    TokenResponseSerializer,
    UserSerializer,
)
from apps.core.tests.factories import UserFactory


@pytest.mark.django_db
class TestUserSerializer:
    """Tests for UserSerializer."""

    def test_serializes_user_with_all_fields(self):
        """UserSerializer includes all expected fields."""
        user = UserFactory(
            email="test@example.com",
            first_name="John",
            last_name="Doe",
            avatar="https://example.com/avatar.jpg",
        )

        serializer = UserSerializer(user)

        assert serializer.data["id"] == user.id
        assert serializer.data["email"] == "test@example.com"
        assert serializer.data["first_name"] == "John"
        assert serializer.data["last_name"] == "Doe"
        assert serializer.data["avatar"] == "https://example.com/avatar.jpg"
        assert "user_type" in serializer.data

    def test_all_fields_are_read_only(self):
        """UserSerializer fields are read-only."""
        serializer = UserSerializer()
        fields = serializer.Meta.fields

        for field_name in fields:
            assert field_name in serializer.Meta.read_only_fields

    def test_serializes_user_without_optional_fields(self):
        """UserSerializer works with minimal user data."""
        user = UserFactory(first_name="", last_name="", avatar="")

        serializer = UserSerializer(user)

        assert serializer.data["first_name"] == ""
        assert serializer.data["last_name"] == ""
        assert serializer.data["avatar"] == ""


class TestGoogleAuthSerializer:
    """Tests for GoogleAuthSerializer."""

    def test_valid_with_id_token(self):
        """GoogleAuthSerializer validates with id_token."""
        data = {"id_token": "valid.google.token"}

        serializer = GoogleAuthSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["id_token"] == "valid.google.token"

    def test_invalid_without_id_token(self):
        """GoogleAuthSerializer is invalid without id_token."""
        serializer = GoogleAuthSerializer(data={})

        assert not serializer.is_valid()
        assert "id_token" in serializer.errors

    def test_invalid_with_empty_id_token(self):
        """GoogleAuthSerializer is invalid with empty id_token."""
        serializer = GoogleAuthSerializer(data={"id_token": ""})

        assert not serializer.is_valid()
        assert "id_token" in serializer.errors

    def test_help_text_is_present(self):
        """GoogleAuthSerializer has descriptive help text."""
        serializer = GoogleAuthSerializer()

        assert "id_token" in serializer.fields
        assert "OAuth flow" in serializer.fields["id_token"].help_text


class TestGitHubAuthSerializer:
    """Tests for GitHubAuthSerializer."""

    def test_valid_with_access_token(self):
        """GitHubAuthSerializer validates with access_token."""
        data = {"access_token": "ghp_validtoken123"}

        serializer = GitHubAuthSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["access_token"] == "ghp_validtoken123"

    def test_invalid_without_access_token(self):
        """GitHubAuthSerializer is invalid without access_token."""
        serializer = GitHubAuthSerializer(data={})

        assert not serializer.is_valid()
        assert "access_token" in serializer.errors

    def test_invalid_with_empty_access_token(self):
        """GitHubAuthSerializer is invalid with empty access_token."""
        serializer = GitHubAuthSerializer(data={"access_token": ""})

        assert not serializer.is_valid()
        assert "access_token" in serializer.errors

    def test_help_text_is_present(self):
        """GitHubAuthSerializer has descriptive help text."""
        serializer = GitHubAuthSerializer()

        assert "access_token" in serializer.fields
        assert "OAuth flow" in serializer.fields["access_token"].help_text


class TestTokenResponseSerializer:
    """Tests for TokenResponseSerializer."""

    def test_serializes_token_response(self):
        """TokenResponseSerializer includes all token fields."""
        data = {
            "access": "access.token.here",
            "refresh": "refresh.token.here",
            "user": {
                "id": 1,
                "email": "test@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "avatar": "",
                "user_type": "student",
            },
        }

        serializer = TokenResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["access"] == "access.token.here"
        assert serializer.validated_data["refresh"] == "refresh.token.here"
        assert "user" in serializer.validated_data

    def test_has_help_text_for_fields(self):
        """TokenResponseSerializer has descriptive help text."""
        serializer = TokenResponseSerializer()

        assert "JWT" in serializer.fields["access"].help_text
        assert "JWT" in serializer.fields["refresh"].help_text


class TestLogoutSerializer:
    """Tests for LogoutSerializer."""

    def test_valid_with_refresh_token(self):
        """LogoutSerializer validates with refresh token."""
        data = {"refresh": "refresh.token.here"}

        serializer = LogoutSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["refresh"] == "refresh.token.here"

    def test_invalid_without_refresh_token(self):
        """LogoutSerializer is invalid without refresh token."""
        serializer = LogoutSerializer(data={})

        assert not serializer.is_valid()
        assert "refresh" in serializer.errors

    def test_invalid_with_empty_refresh_token(self):
        """LogoutSerializer is invalid with empty refresh token."""
        serializer = LogoutSerializer(data={"refresh": ""})

        assert not serializer.is_valid()
        assert "refresh" in serializer.errors

    def test_help_text_is_present(self):
        """LogoutSerializer has descriptive help text."""
        serializer = LogoutSerializer()

        assert "refresh" in serializer.fields
        assert "blacklist" in serializer.fields["refresh"].help_text.lower()
