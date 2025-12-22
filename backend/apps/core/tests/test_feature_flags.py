"""
Tests for feature flags integration.

Tests the Unleash client integration and feature flag/experiment functions.
"""

from unittest.mock import MagicMock, patch

import pytest

from apps.core.feature_flags import (
    EXPERIMENTS,
    FEATURE_FLAGS,
    get_all_flags,
    get_unleash_client,
    get_variant,
    is_enabled,
)
from apps.core.tests.factories import UserFactory


class TestUnleashClient:
    """Tests for Unleash client initialization."""

    @patch("apps.core.feature_flags.UnleashClient")
    def test_get_unleash_client_initializes_once(self, mock_unleash_class):
        """get_unleash_client returns singleton instance."""
        mock_instance = MagicMock()
        mock_unleash_class.return_value = mock_instance

        # Reset singleton for clean test
        from apps.core.feature_flags import UnleashClientHolder

        UnleashClientHolder._instance = None

        # First call initializes
        client1 = get_unleash_client()
        assert client1 == mock_instance
        mock_unleash_class.assert_called_once()
        mock_instance.initialize_client.assert_called_once()

        # Second call returns same instance
        client2 = get_unleash_client()
        assert client2 == client1
        # Should not create new client
        assert mock_unleash_class.call_count == 1

    @patch("apps.core.feature_flags.UnleashClient")
    def test_cleanup_destroys_client(self, mock_unleash_class):
        """UnleashClientHolder.cleanup destroys the client."""
        from apps.core.feature_flags import UnleashClientHolder

        mock_instance = MagicMock()
        mock_unleash_class.return_value = mock_instance

        UnleashClientHolder._instance = None
        get_unleash_client()

        UnleashClientHolder.cleanup()
        mock_instance.destroy.assert_called_once()
        assert UnleashClientHolder._instance is None


@pytest.mark.django_db
class TestIsEnabled:
    """Tests for is_enabled function."""

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_is_enabled_returns_true_when_flag_enabled(self, mock_get_client):
        """is_enabled returns True when flag is enabled."""
        mock_client = MagicMock()
        mock_client.is_enabled.return_value = True
        mock_get_client.return_value = mock_client

        result = is_enabled("semantic_search_enabled")

        assert result is True
        mock_client.is_enabled.assert_called_once_with("semantic_search_enabled", {})

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_is_enabled_returns_false_when_flag_disabled(self, mock_get_client):
        """is_enabled returns False when flag is disabled."""
        mock_client = MagicMock()
        mock_client.is_enabled.return_value = False
        mock_get_client.return_value = mock_client

        result = is_enabled("semantic_search_enabled")

        assert result is False

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_is_enabled_with_authenticated_user(self, mock_get_client):
        """is_enabled includes user ID in context for authenticated users."""
        user = UserFactory()
        mock_client = MagicMock()
        mock_client.is_enabled.return_value = True
        mock_get_client.return_value = mock_client

        is_enabled("semantic_search_enabled", user)

        mock_client.is_enabled.assert_called_once_with(
            "semantic_search_enabled", {"userId": str(user.id)}
        )

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_is_enabled_returns_false_on_exception(self, mock_get_client):
        """is_enabled returns False when Unleash client raises exception."""
        mock_client = MagicMock()
        mock_client.is_enabled.side_effect = Exception("Connection error")
        mock_get_client.return_value = mock_client

        result = is_enabled("semantic_search_enabled")

        assert result is False


@pytest.mark.django_db
class TestGetVariant:
    """Tests for get_variant function."""

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_get_variant_returns_variant_name(self, mock_get_client):
        """get_variant returns the variant name from Unleash."""
        mock_client = MagicMock()
        mock_client.get_variant.return_value = {"name": "v2", "enabled": True}
        mock_get_client.return_value = mock_client

        result = get_variant("tutor_card_experiment")

        assert result == "v2"
        mock_client.get_variant.assert_called_once_with("tutor_card_experiment", {})

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_get_variant_returns_control_as_default(self, mock_get_client):
        """get_variant returns 'control' when variant not found."""
        mock_client = MagicMock()
        mock_client.get_variant.return_value = None
        mock_get_client.return_value = mock_client

        result = get_variant("tutor_card_experiment")

        assert result == "control"

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_get_variant_with_authenticated_user(self, mock_get_client):
        """get_variant includes user ID in context for authenticated users."""
        user = UserFactory()
        mock_client = MagicMock()
        mock_client.get_variant.return_value = {"name": "v2"}
        mock_get_client.return_value = mock_client

        get_variant("tutor_card_experiment", user)

        mock_client.get_variant.assert_called_once_with(
            "tutor_card_experiment", {"userId": str(user.id)}
        )

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_get_variant_returns_control_on_exception(self, mock_get_client):
        """get_variant returns 'control' when Unleash client raises exception."""
        mock_client = MagicMock()
        mock_client.get_variant.side_effect = Exception("Connection error")
        mock_get_client.return_value = mock_client

        result = get_variant("tutor_card_experiment")

        assert result == "control"

    @patch("apps.core.feature_flags.get_unleash_client")
    def test_get_variant_handles_missing_name_field(self, mock_get_client):
        """get_variant returns 'control' when variant dict missing name field."""
        mock_client = MagicMock()
        mock_client.get_variant.return_value = {"enabled": True}  # No 'name' field
        mock_get_client.return_value = mock_client

        result = get_variant("tutor_card_experiment")

        assert result == "control"


@pytest.mark.django_db
class TestGetAllFlags:
    """Tests for get_all_flags function."""

    @patch("apps.core.feature_flags.is_enabled")
    @patch("apps.core.feature_flags.get_variant")
    def test_get_all_flags_returns_all_flags_and_experiments(
        self, mock_get_variant, mock_is_enabled
    ):
        """get_all_flags returns dict with all flags and experiments."""
        mock_is_enabled.side_effect = lambda flag, user: flag == "semantic_search_enabled"
        mock_get_variant.side_effect = lambda exp, user: (
            "v2" if exp == "tutor_card_experiment" else "control"
        )

        result = get_all_flags()

        assert "flags" in result
        assert "experiments" in result
        assert len(result["flags"]) == len(FEATURE_FLAGS)
        assert len(result["experiments"]) == len(EXPERIMENTS)

    @patch("apps.core.feature_flags.is_enabled")
    @patch("apps.core.feature_flags.get_variant")
    def test_get_all_flags_with_user(self, mock_get_variant, mock_is_enabled):
        """get_all_flags passes user to is_enabled and get_variant."""
        user = UserFactory()
        mock_is_enabled.return_value = False
        mock_get_variant.return_value = "control"

        get_all_flags(user)

        # Check that user was passed to all calls
        for call in mock_is_enabled.call_args_list:
            assert call[0][1] == user
        for call in mock_get_variant.call_args_list:
            assert call[0][1] == user

    @patch("apps.core.feature_flags.is_enabled")
    @patch("apps.core.feature_flags.get_variant")
    def test_get_all_flags_structure(self, mock_get_variant, mock_is_enabled):
        """get_all_flags returns correct structure with expected keys."""
        mock_is_enabled.return_value = True
        mock_get_variant.return_value = "v2"

        result = get_all_flags()

        # Check flags are boolean values
        assert all(isinstance(v, bool) for v in result["flags"].values())
        # Check experiments are string values
        assert all(isinstance(v, str) for v in result["experiments"].values())
        # Check expected flag names are present
        assert "semantic_search_enabled" in result["flags"]
        assert "chat_reactions_enabled" in result["flags"]
        # Check expected experiment names are present
        assert "tutor_card_experiment" in result["experiments"]
        assert "checkout_flow_experiment" in result["experiments"]
