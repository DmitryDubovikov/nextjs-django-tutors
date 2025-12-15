"""
Booking models for lesson scheduling.
"""

from django.db import models

from apps.core.models import User
from apps.tutors.models import Tutor


class Booking(models.Model):
    """
    Booking model for scheduling lessons between students and tutors.

    Stores information about scheduled lessons including time, duration, status, and price.
    """

    class Status(models.TextChoices):
        """Booking status choices."""

        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    tutor = models.ForeignKey(
        Tutor,
        on_delete=models.CASCADE,
        related_name="bookings",
        help_text="The tutor for this booking",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bookings",
        help_text="The student who made the booking",
    )
    scheduled_at = models.DateTimeField(
        help_text="When the lesson is scheduled",
    )
    duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text="Lesson duration in minutes",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current status of the booking",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Price at the time of booking",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Additional notes from student",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bookings"
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["tutor", "scheduled_at"]),
            models.Index(fields=["student", "scheduled_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.student} -> {self.tutor} @ {self.scheduled_at}"
