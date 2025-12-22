"""
Feature flags integration with Unleash.

Provides functions for checking feature flags and getting experiment variants.
Backend is the source of truth for all feature flags and experiments.
"""

import atexit
import logging
from typing import TYPE_CHECKING

from django.conf import settings

from UnleashClient import UnleashClient

if TYPE_CHECKING:
    from apps.core.models import User

logger = logging.getLogger(__name__)

# Unleash client configuration
UNLEASH_URL = getattr(settings, "UNLEASH_URL", "http://unleash:4242/api")
UNLEASH_APP_NAME = getattr(settings, "UNLEASH_APP_NAME", "tutors-backend")
UNLEASH_INSTANCE_ID = getattr(settings, "UNLEASH_INSTANCE_ID", "backend-1")
UNLEASH_API_TOKEN = getattr(
    settings, "UNLEASH_API_TOKEN", "default:development.unleash-client-token"
)

# Warn if using default token in production
if not settings.DEBUG and UNLEASH_API_TOKEN == "default:development.unleash-client-token":
    logger.warning("Using default Unleash token in production - please set UNLEASH_API_TOKEN")

# Define available feature flags (on/off toggles)
FEATURE_FLAGS = [
    "semantic_search_enabled",
    "chat_reactions_enabled",
]

# Define available experiments (multi-variant)
EXPERIMENTS = [
    "tutor_card_experiment",
    "checkout_flow_experiment",
]


class UnleashClientHolder:
    """Singleton holder for Unleash client to avoid global statement warnings."""

    _instance: UnleashClient | None = None

    @classmethod
    def get_client(cls) -> UnleashClient:
        """Get or create the Unleash client singleton."""
        if cls._instance is None:
            cls._instance = UnleashClient(
                url=UNLEASH_URL,
                app_name=UNLEASH_APP_NAME,
                instance_id=UNLEASH_INSTANCE_ID,
                custom_headers={"Authorization": UNLEASH_API_TOKEN},
            )
            try:
                cls._instance.initialize_client()
                logger.info("Unleash client initialized successfully")
            except Exception as e:
                logger.warning("Failed to initialize Unleash client: %s", e)

            atexit.register(cls.cleanup)

        return cls._instance

    @classmethod
    def cleanup(cls) -> None:
        """Cleanup Unleash client on application shutdown."""
        if cls._instance is not None:
            try:
                cls._instance.destroy()
            except Exception as e:
                logger.warning("Error destroying Unleash client: %s", e)
            cls._instance = None


def get_unleash_client() -> UnleashClient:
    """Get or create the Unleash client singleton."""
    return UnleashClientHolder.get_client()


def is_enabled(flag: str, user: "User | None" = None) -> bool:
    """
    Check if feature flag is enabled (on/off toggle).

    Args:
        flag: The feature flag name
        user: Optional user for user-specific targeting

    Returns:
        True if enabled, False otherwise
    """
    context = {}
    if user is not None:
        context["userId"] = str(user.id)

    try:
        client = get_unleash_client()
        return client.is_enabled(flag, context)
    except Exception as e:
        logger.warning("Error checking feature flag '%s': %s", flag, e)
        return False


def get_variant(flag: str, user: "User | None" = None) -> str:
    """
    Get experiment variant for user.

    Args:
        flag: The experiment flag name
        user: Optional user for consistent variant assignment

    Returns:
        Variant name, defaults to 'control' if not found or error
    """
    context = {}
    if user is not None:
        context["userId"] = str(user.id)

    try:
        client = get_unleash_client()
        variant = client.get_variant(flag, context)
        return variant.get("name", "control") if variant else "control"
    except Exception as e:
        logger.warning("Error getting variant for '%s': %s", flag, e)
        return "control"


def get_all_flags(user: "User | None" = None) -> dict:
    """
    Get all feature flags and experiments for a user.

    Used to bootstrap the frontend with computed variants from backend.

    Args:
        user: Optional user for user-specific targeting

    Returns:
        Dict with 'flags' (bool values) and 'experiments' (variant names)
    """
    flags = {flag: is_enabled(flag, user) for flag in FEATURE_FLAGS}
    experiments = {exp: get_variant(exp, user) for exp in EXPERIMENTS}

    return {
        "flags": flags,
        "experiments": experiments,
    }
