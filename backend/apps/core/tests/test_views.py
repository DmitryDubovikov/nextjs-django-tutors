"""
Tests for core app views.

Tests OAuth authentication views and JWT token management.
"""

from unittest.mock import MagicMock, Mock, patch

from rest_framework import status

import httpx
import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import User
from apps.core.tests.factories import UserFactory


@pytest.mark.django_db
class TestGoogleAuthView:
    """Tests for GoogleAuthView."""

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_successful_google_auth_new_user(self, mock_verify, api_client):
        """POST /api/auth/google/ creates new user and returns tokens."""
        mock_verify.return_value = {
            "email": "newuser@gmail.com",
            "given_name": "John",
            "family_name": "Doe",
            "picture": "https://lh3.googleusercontent.com/a/photo123",
        }

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "valid.google.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data

        # Check user was created
        user = User.objects.get(email="newuser@gmail.com")
        assert user.username == "newuser@gmail.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.avatar == "https://lh3.googleusercontent.com/a/photo123"

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_successful_google_auth_existing_user(self, mock_verify, api_client):
        """POST /api/auth/google/ returns tokens for existing user."""
        existing_user = UserFactory(email="existing@gmail.com")
        mock_verify.return_value = {
            "email": "existing@gmail.com",
            "given_name": "Jane",
            "family_name": "Smith",
        }

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "valid.google.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["id"] == existing_user.id
        # User count should not increase
        assert User.objects.count() == 1

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_google_auth_with_invalid_token(self, mock_verify, api_client):
        """POST /api/auth/google/ returns 401 for invalid token."""
        mock_verify.side_effect = ValueError("Invalid token")

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "invalid.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "error" in response.data
        assert "Invalid Google token" in response.data["error"]

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_google_auth_without_email(self, mock_verify, api_client):
        """POST /api/auth/google/ returns 400 when email missing from token."""
        mock_verify.return_value = {"given_name": "John"}  # No email

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "valid.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email not found" in response.data["error"]

    def test_google_auth_without_id_token(self, api_client):
        """POST /api/auth/google/ returns 400 without id_token."""
        response = api_client.post("/api/auth/google/", {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "id_token" in response.data

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_google_auth_returns_valid_jwt_tokens(self, mock_verify, api_client):
        """POST /api/auth/google/ returns valid JWT tokens."""
        mock_verify.return_value = {
            "email": "test@gmail.com",
            "given_name": "Test",
            "family_name": "User",
        }

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "valid.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify access token is valid
        access_token = response.data["access"]
        assert isinstance(access_token, str)
        assert len(access_token) > 0

        # Verify refresh token is valid
        refresh_token = response.data["refresh"]
        assert isinstance(refresh_token, str)
        assert len(refresh_token) > 0

    @patch("apps.core.views.id_token.verify_oauth2_token")
    def test_google_auth_user_data_structure(self, mock_verify, api_client):
        """POST /api/auth/google/ returns complete user data."""
        mock_verify.return_value = {
            "email": "complete@gmail.com",
            "given_name": "Complete",
            "family_name": "User",
            "picture": "https://lh3.googleusercontent.com/a/pic.jpg",
        }

        response = api_client.post(
            "/api/auth/google/",
            {"id_token": "valid.token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user_data = response.data["user"]
        assert "id" in user_data
        assert "email" in user_data
        assert "first_name" in user_data
        assert "last_name" in user_data
        assert "avatar" in user_data
        assert "user_type" in user_data


@pytest.mark.django_db
class TestGitHubAuthView:
    """Tests for GitHubAuthView."""

    @patch("apps.core.views.httpx.Client")
    def test_successful_github_auth_new_user(self, mock_client_class, api_client):
        """POST /api/auth/github/ creates new user and returns tokens."""
        # Mock httpx client
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        # Mock user response
        user_response = Mock()
        user_response.json.return_value = {
            "email": "github@example.com",
            "name": "GitHub User",
            "avatar_url": "https://avatars.githubusercontent.com/u/123",
        }
        mock_client.get.return_value = user_response

        # Mock emails response
        emails_response = Mock()
        emails_response.json.return_value = [
            {"email": "github@example.com", "primary": True, "verified": True}
        ]

        mock_client.get.side_effect = [user_response, emails_response]

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "ghp_validtoken123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "user" in response.data

        # Check user was created
        user = User.objects.get(email="github@example.com")
        assert user.username == "github@example.com"
        assert user.first_name == "GitHub"
        assert user.last_name == "User"
        assert user.avatar == "https://avatars.githubusercontent.com/u/123"

    @patch("apps.core.views.httpx.Client")
    def test_successful_github_auth_existing_user(self, mock_client_class, api_client):
        """POST /api/auth/github/ returns tokens for existing user."""
        existing_user = UserFactory(email="existing@github.com")

        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        user_response = Mock()
        user_response.json.return_value = {
            "email": "existing@github.com",
            "name": "Existing User",
        }

        emails_response = Mock()
        emails_response.json.return_value = [{"email": "existing@github.com", "primary": True}]

        mock_client.get.side_effect = [user_response, emails_response]

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "ghp_token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["id"] == existing_user.id
        assert User.objects.count() == 1

    @patch("apps.core.views.httpx.Client")
    def test_github_auth_with_invalid_token(self, mock_client_class, api_client):
        """POST /api/auth/github/ returns 401 for invalid token."""
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        mock_client.get.side_effect = httpx.HTTPError("Unauthorized")

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "invalid_token"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Failed to fetch GitHub user info" in response.data["error"]

    @patch("apps.core.views.httpx.Client")
    def test_github_auth_without_email(self, mock_client_class, api_client):
        """POST /api/auth/github/ returns 400 when no email available."""
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        user_response = Mock()
        user_response.json.return_value = {"name": "No Email User"}

        emails_response = Mock()
        emails_response.json.return_value = []

        mock_client.get.side_effect = [user_response, emails_response]

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "ghp_token"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Could not determine user email" in response.data["error"]

    def test_github_auth_without_access_token(self, api_client):
        """POST /api/auth/github/ returns 400 without access_token."""
        response = api_client.post("/api/auth/github/", {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "access_token" in response.data

    @patch("apps.core.views.httpx.Client")
    def test_github_auth_name_parsing(self, mock_client_class, api_client):
        """POST /api/auth/github/ correctly parses name into first/last."""
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        user_response = Mock()
        user_response.json.return_value = {
            "email": "test@github.com",
            "name": "First Middle Last",
        }

        emails_response = Mock()
        emails_response.json.return_value = [{"email": "test@github.com", "primary": True}]

        mock_client.get.side_effect = [user_response, emails_response]

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "ghp_token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user = User.objects.get(email="test@github.com")
        assert user.first_name == "First"
        assert user.last_name == "Middle Last"

    @patch("apps.core.views.httpx.Client")
    def test_github_auth_single_name(self, mock_client_class, api_client):
        """POST /api/auth/github/ handles single name correctly."""
        mock_client = MagicMock()
        mock_client_class.return_value.__enter__.return_value = mock_client

        user_response = Mock()
        user_response.json.return_value = {
            "email": "single@github.com",
            "name": "SingleName",
        }

        emails_response = Mock()
        emails_response.json.return_value = [{"email": "single@github.com", "primary": True}]

        mock_client.get.side_effect = [user_response, emails_response]

        response = api_client.post(
            "/api/auth/github/",
            {"access_token": "ghp_token"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user = User.objects.get(email="single@github.com")
        assert user.first_name == "SingleName"
        assert user.last_name == ""


@pytest.mark.django_db
class TestLogoutView:
    """Tests for LogoutView."""

    def test_successful_logout(self, api_client):
        """POST /api/auth/logout/ blacklists refresh token."""
        user = UserFactory()
        api_client.force_authenticate(user)

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        response = api_client.post(
            "/api/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_logout_with_invalid_token(self, api_client):
        """POST /api/auth/logout/ returns 204 even for invalid token (forgiving approach)."""
        user = UserFactory()
        api_client.force_authenticate(user)

        response = api_client.post(
            "/api/auth/logout/",
            {"refresh": "invalid.token.here"},
            format="json",
        )

        # Forgiving approach: invalid tokens are silently ignored
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_logout_without_refresh_token(self, api_client):
        """POST /api/auth/logout/ returns 400 without refresh token."""
        user = UserFactory()
        api_client.force_authenticate(user)

        response = api_client.post("/api/auth/logout/", {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "refresh" in response.data

    def test_logout_without_authentication(self, api_client):
        """POST /api/auth/logout/ works without authentication (forgiving approach)."""
        refresh = RefreshToken.for_user(UserFactory())

        response = api_client.post(
            "/api/auth/logout/",
            {"refresh": str(refresh)},
            format="json",
        )

        # Forgiving approach: logout works even without auth if token is valid
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_logout_with_already_blacklisted_token(self, api_client):
        """POST /api/auth/logout/ returns 204 for already blacklisted token (idempotent)."""
        user = UserFactory()
        api_client.force_authenticate(user)

        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)

        # Blacklist it once
        refresh.blacklist()

        # Try to blacklist again - should succeed silently (idempotent)
        response = api_client.post(
            "/api/auth/logout/",
            {"refresh": refresh_token},
            format="json",
        )

        # Forgiving approach: already blacklisted tokens are silently ignored
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestCurrentUserView:
    """Tests for CurrentUserView."""

    def test_get_current_user(self, api_client):
        """GET /api/auth/me/ returns current user info."""
        user = UserFactory(
            email="current@example.com",
            first_name="Current",
            last_name="User",
        )
        api_client.force_authenticate(user)

        response = api_client.get("/api/auth/me/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == user.id
        assert response.data["email"] == "current@example.com"
        assert response.data["first_name"] == "Current"
        assert response.data["last_name"] == "User"

    def test_current_user_requires_authentication(self, api_client):
        """GET /api/auth/me/ requires authentication."""
        response = api_client.get("/api/auth/me/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_current_user_returns_complete_data(self, api_client):
        """GET /api/auth/me/ returns all user fields."""
        user = UserFactory()
        api_client.force_authenticate(user)

        response = api_client.get("/api/auth/me/")

        assert response.status_code == status.HTTP_200_OK
        assert "id" in response.data
        assert "email" in response.data
        assert "first_name" in response.data
        assert "last_name" in response.data
        assert "avatar" in response.data
        assert "user_type" in response.data
