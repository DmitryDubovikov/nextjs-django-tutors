"""
Tutors app models.

Contains the Tutor and TutorDraft models for tutor profiles.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import User


class TutorDraft(models.Model):
    """
    Draft tutor profile for saving progress during wizard completion.

    Stores partial tutor profile data in JSON format to allow users to
    save their progress and resume later. Each user can have only one draft.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="tutor_draft",
    )
    data = models.JSONField(
        default=dict,
        help_text="Draft profile data in JSON format",
    )
    current_step = models.PositiveSmallIntegerField(
        default=0,
        help_text="Current wizard step (0-4)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tutor_drafts"
        verbose_name = "Tutor Draft"
        verbose_name_plural = "Tutor Drafts"

    def __str__(self) -> str:
        return f"Draft for {self.user}"


class Tutor(models.Model):
    """
    Tutor profile model linked to a User.

    Stores tutor-specific information like headline, bio, hourly rate, and subjects.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="tutor_profile",
    )
    headline = models.CharField(
        max_length=200,
        help_text="Short tagline describing the tutor",
    )
    bio = models.TextField(
        help_text="Detailed description of the tutor's experience and approach",
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        help_text="Price per hour in local currency",
    )
    subjects = models.JSONField(
        default=list,
        help_text="List of subjects the tutor teaches",
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the tutor's credentials have been verified",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tutors"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username

    @property
    def full_name(self) -> str:
        """Return the tutor's full name."""
        return f"{self.user.first_name} {self.user.last_name}".strip()

    @property
    def avatar_url(self) -> str:
        """Return the tutor's avatar URL."""
        return self.user.avatar
