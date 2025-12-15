"""
Serializers for tutors app.
"""

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Tutor, TutorDraft


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
    formats = serializers.ListField(
        child=serializers.CharField(),
        help_text="Teaching formats: ['online', 'offline']",
    )

    class Meta:
        model = Tutor
        fields = [
            "id",
            "slug",
            "full_name",
            "avatar_url",
            "headline",
            "bio",
            "hourly_rate",
            "subjects",
            "is_verified",
            "rating",
            "reviews_count",
            "location",
            "formats",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]

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


class TutorDraftSerializer(serializers.ModelSerializer):
    """
    Serializer for TutorDraft model.

    Handles saving and retrieving tutor profile drafts.
    """

    class Meta:
        model = TutorDraft
        fields = ["id", "data", "current_step", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        """Create or update draft for the current user."""
        user = self.context["request"].user
        draft, _ = TutorDraft.objects.update_or_create(
            user=user,
            defaults=validated_data,
        )
        return draft

    def update(self, instance, validated_data):
        """Update existing draft."""
        instance.data = validated_data.get("data", instance.data)
        instance.current_step = validated_data.get("current_step", instance.current_step)
        instance.save()
        return instance
