"""
Serializers for tutors app.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Tutor


class TutorSerializer(serializers.ModelSerializer):
    """
    Serializer for Tutor model.

    Used for list and retrieve operations.
    """

    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    subjects = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of subjects the tutor teaches",
    )

    class Meta:
        model = Tutor
        fields = [
            "id",
            "full_name",
            "avatar_url",
            "headline",
            "bio",
            "hourly_rate",
            "subjects",
            "is_verified",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    @extend_schema_field(OpenApiTypes.STR)
    def get_full_name(self, obj: Tutor) -> str:
        """Return the tutor's full name."""
        return obj.full_name

    @extend_schema_field(OpenApiTypes.URI)
    def get_avatar_url(self, obj: Tutor) -> str:
        """Return the tutor's avatar URL."""
        return obj.avatar_url


class TutorDetailSerializer(TutorSerializer):
    """
    Detailed serializer for Tutor model.

    Includes additional fields for the detail view.
    """

    email = serializers.SerializerMethodField()

    class Meta(TutorSerializer.Meta):
        fields = [*TutorSerializer.Meta.fields, "email", "updated_at"]

    @extend_schema_field(OpenApiTypes.EMAIL)
    def get_email(self, obj: Tutor) -> str:
        """Return the tutor's email."""
        return obj.user.email
