"""
Serializers for bookings app.
"""

from decimal import Decimal

from rest_framework import serializers

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for Booking model.

    Used for list and retrieve operations.
    """

    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_slug = serializers.CharField(source="tutor.slug", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "tutor",
            "tutor_name",
            "tutor_slug",
            "student",
            "student_name",
            "scheduled_at",
            "duration_minutes",
            "status",
            "price",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "price", "created_at", "updated_at"]

    def get_student_name(self, obj: Booking) -> str:
        """Return the student's full name."""
        return obj.student.get_full_name() or obj.student.username


class CreateBookingSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new bookings.

    Automatically sets the student and calculates price based on tutor's hourly rate.
    """

    class Meta:
        model = Booking
        fields = ["tutor", "scheduled_at", "duration_minutes", "notes"]

    def validate_scheduled_at(self, value):
        """Ensure the scheduled time is in the future."""
        from django.utils import timezone

        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

    def create(self, validated_data):
        """Create a booking with automatically calculated price."""
        request = self.context["request"]
        tutor = validated_data["tutor"]
        duration = validated_data.get("duration_minutes", 60)

        # Calculate price based on tutor's hourly rate
        hours = Decimal(duration) / Decimal(60)
        price = tutor.hourly_rate * hours

        validated_data["student"] = request.user
        validated_data["price"] = price

        return super().create(validated_data)
