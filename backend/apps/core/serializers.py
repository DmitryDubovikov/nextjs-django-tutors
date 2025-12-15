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
