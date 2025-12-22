"""
Tests for core app serializers.

Tests authentication serializers for Google/GitHub OAuth and JWT tokens.
"""

import pytest

from apps.core.serializers import (
    ConversionEventSerializer,
    ExposureEventSerializer,
    FeatureFlagsResponseSerializer,
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

    def test_serializes_is_staff_field(self):
        """UserSerializer includes is_staff field."""
        user = UserFactory(is_staff=False)
        admin = UserFactory(is_staff=True)

        user_serializer = UserSerializer(user)
        admin_serializer = UserSerializer(admin)

        assert user_serializer.data["is_staff"] is False
        assert admin_serializer.data["is_staff"] is True


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


class TestFeatureFlagsResponseSerializer:
    """Tests for FeatureFlagsResponseSerializer."""

    def test_valid_with_flags_and_experiments(self):
        """FeatureFlagsResponseSerializer validates with flags and experiments."""
        data = {
            "flags": {
                "semantic_search_enabled": True,
                "chat_reactions_enabled": False,
            },
            "experiments": {
                "tutor_card_experiment": "v2",
                "checkout_flow_experiment": "control",
            },
        }

        serializer = FeatureFlagsResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["flags"]["semantic_search_enabled"] is True
        assert serializer.validated_data["experiments"]["tutor_card_experiment"] == "v2"

    def test_coerces_string_to_boolean_for_flags(self):
        """FeatureFlagsResponseSerializer coerces 'true' string to boolean."""
        data = {
            "flags": {"semantic_search_enabled": "true"},  # String coerced to boolean
            "experiments": {"tutor_card_experiment": "v2"},
        }

        serializer = FeatureFlagsResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["flags"]["semantic_search_enabled"] is True

    def test_coerces_number_to_string_for_experiments(self):
        """FeatureFlagsResponseSerializer coerces numbers to strings for experiments."""
        data = {
            "flags": {"semantic_search_enabled": True},
            "experiments": {"tutor_card_experiment": 2},  # Number coerced to string
        }

        serializer = FeatureFlagsResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["experiments"]["tutor_card_experiment"] == "2"

    def test_valid_with_empty_dicts(self):
        """FeatureFlagsResponseSerializer validates with empty dicts."""
        data = {"flags": {}, "experiments": {}}

        serializer = FeatureFlagsResponseSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["flags"] == {}
        assert serializer.validated_data["experiments"] == {}

    def test_has_help_text(self):
        """FeatureFlagsResponseSerializer has descriptive help text."""
        serializer = FeatureFlagsResponseSerializer()

        assert "flags" in serializer.fields
        assert "experiments" in serializer.fields
        assert serializer.fields["flags"].help_text
        assert serializer.fields["experiments"].help_text


class TestExposureEventSerializer:
    """Tests for ExposureEventSerializer."""

    def test_valid_with_required_fields(self):
        """ExposureEventSerializer validates with experiment and variant."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
        }

        serializer = ExposureEventSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["experiment"] == "tutor_card_experiment"
        assert serializer.validated_data["variant"] == "v2"

    def test_valid_with_session_id(self):
        """ExposureEventSerializer validates with optional session_id."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "session_id": "session-123",
        }

        serializer = ExposureEventSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["session_id"] == "session-123"

    def test_valid_with_empty_session_id(self):
        """ExposureEventSerializer validates with empty session_id."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "session_id": "",
        }

        serializer = ExposureEventSerializer(data=data)

        assert serializer.is_valid()

    def test_invalid_without_experiment(self):
        """ExposureEventSerializer is invalid without experiment."""
        data = {"variant": "v2"}

        serializer = ExposureEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "experiment" in serializer.errors

    def test_invalid_without_variant(self):
        """ExposureEventSerializer is invalid without variant."""
        data = {"experiment": "tutor_card_experiment"}

        serializer = ExposureEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "variant" in serializer.errors

    def test_has_help_text(self):
        """ExposureEventSerializer has descriptive help text."""
        serializer = ExposureEventSerializer()

        assert "experiment" in serializer.fields
        assert "variant" in serializer.fields
        assert serializer.fields["experiment"].help_text
        assert serializer.fields["variant"].help_text


class TestConversionEventSerializer:
    """Tests for ConversionEventSerializer."""

    def test_valid_with_all_fields(self):
        """ConversionEventSerializer validates with all fields."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "metric": "click",
            "metadata": {"tutorId": 123, "subject": "math"},
        }

        serializer = ConversionEventSerializer(data=data)

        assert serializer.is_valid()
        assert serializer.validated_data["experiment"] == "tutor_card_experiment"
        assert serializer.validated_data["variant"] == "v2"
        assert serializer.validated_data["metric"] == "click"
        assert serializer.validated_data["metadata"] == {"tutorId": 123, "subject": "math"}

    def test_valid_with_all_metric_choices(self):
        """ConversionEventSerializer validates all metric choices."""
        valid_metrics = ["click", "booking", "checkout_success", "checkout_abandon"]

        for metric in valid_metrics:
            data = {
                "experiment": "tutor_card_experiment",
                "variant": "v2",
                "metric": metric,
            }

            serializer = ConversionEventSerializer(data=data)
            assert serializer.is_valid(), f"Failed for metric: {metric}"

    def test_invalid_with_invalid_metric(self):
        """ConversionEventSerializer is invalid with invalid metric."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "metric": "invalid_metric",
        }

        serializer = ConversionEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "metric" in serializer.errors

    def test_valid_without_metadata(self):
        """ConversionEventSerializer validates without metadata (optional)."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "metric": "click",
        }

        serializer = ConversionEventSerializer(data=data)

        assert serializer.is_valid()

    def test_valid_with_null_metadata(self):
        """ConversionEventSerializer validates with null metadata."""
        data = {
            "experiment": "tutor_card_experiment",
            "variant": "v2",
            "metric": "click",
            "metadata": None,
        }

        serializer = ConversionEventSerializer(data=data)

        assert serializer.is_valid()

    def test_invalid_without_experiment(self):
        """ConversionEventSerializer is invalid without experiment."""
        data = {"variant": "v2", "metric": "click"}

        serializer = ConversionEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "experiment" in serializer.errors

    def test_invalid_without_variant(self):
        """ConversionEventSerializer is invalid without variant."""
        data = {"experiment": "tutor_card_experiment", "metric": "click"}

        serializer = ConversionEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "variant" in serializer.errors

    def test_invalid_without_metric(self):
        """ConversionEventSerializer is invalid without metric."""
        data = {"experiment": "tutor_card_experiment", "variant": "v2"}

        serializer = ConversionEventSerializer(data=data)

        assert not serializer.is_valid()
        assert "metric" in serializer.errors

    def test_has_help_text(self):
        """ConversionEventSerializer has descriptive help text."""
        serializer = ConversionEventSerializer()

        assert "experiment" in serializer.fields
        assert "variant" in serializer.fields
        assert "metric" in serializer.fields
        assert serializer.fields["experiment"].help_text
        assert serializer.fields["variant"].help_text
        assert serializer.fields["metric"].help_text
