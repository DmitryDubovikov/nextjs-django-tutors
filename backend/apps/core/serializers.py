"""
Core app serializers.

Contains serializers for user and authentication.
"""

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user information returned in auth responses."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "avatar",
            "user_type",
            "is_staff",
        ]
        read_only_fields = fields


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth authentication request."""

    id_token = serializers.CharField(help_text="Google id_token from OAuth flow")


class GitHubAuthSerializer(serializers.Serializer):
    """Serializer for GitHub OAuth authentication request."""

    access_token = serializers.CharField(help_text="GitHub access_token from OAuth flow")


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for JWT token response."""

    access = serializers.CharField(help_text="JWT access token")
    refresh = serializers.CharField(help_text="JWT refresh token")
    user = UserSerializer()


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout request."""

    refresh = serializers.CharField(help_text="JWT refresh token to blacklist")


class CredentialsLoginSerializer(serializers.Serializer):
    """Serializer for email/password login request."""

    email = serializers.EmailField(help_text="User email address")
    password = serializers.CharField(
        write_only=True,
        help_text="User password",
        style={"input_type": "password"},
    )


class CredentialsRegisterSerializer(serializers.Serializer):
    """Serializer for email/password registration request."""

    email = serializers.EmailField(help_text="User email address")
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="User password (minimum 8 characters)",
        style={"input_type": "password"},
    )
    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        help_text="User first name",
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        help_text="User last name",
    )


class FeatureFlagsResponseSerializer(serializers.Serializer):
    """Serializer for feature flags response."""

    flags = serializers.DictField(
        child=serializers.BooleanField(),
        help_text="Feature flag name to enabled status mapping",
    )
    experiments = serializers.DictField(
        child=serializers.CharField(),
        help_text="Experiment name to variant name mapping",
    )


class ExposureEventSerializer(serializers.Serializer):
    """Serializer for experiment exposure events."""

    experiment = serializers.CharField(help_text="Experiment name")
    variant = serializers.CharField(help_text="Variant name the user was exposed to")
    session_id = serializers.CharField(
        required=False, allow_blank=True, help_text="Client session ID"
    )


class ConversionEventSerializer(serializers.Serializer):
    """Serializer for conversion events linked to experiments."""

    experiment = serializers.CharField(help_text="Experiment name")
    variant = serializers.CharField(help_text="Variant name")
    metric = serializers.ChoiceField(
        choices=["click", "booking", "checkout_success", "checkout_abandon"],
        help_text="Type of conversion event",
    )
    metadata = serializers.DictField(
        required=False,
        allow_null=True,
        help_text="Additional metadata for the event",
    )
