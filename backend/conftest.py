"""Fixtures for pytest."""

from typing import Any

from rest_framework.test import APIClient

import pytest


@pytest.fixture
def api_client() -> APIClient:
    """Return API client for REST Framework testing."""
    return APIClient()


@pytest.fixture
def user_data() -> dict[str, Any]:
    """Return test user data."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "first_name": "Test",
        "last_name": "User",
    }


@pytest.fixture
def tutor_data() -> dict[str, Any]:
    """Return test tutor data."""
    return {
        "headline": "Experienced Math Tutor",
        "bio": "I have 10 years of teaching experience in mathematics.",
        "hourly_rate": "50.00",
        "subjects": ["math", "physics"],
        "is_verified": False,
    }


@pytest.fixture
def mock_settings(settings):
    """Return Django settings for mocking in tests."""
    return settings
