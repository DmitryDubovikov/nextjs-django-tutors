"""
Core app models.

Contains the custom User model with user_type field.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with user_type to distinguish tutors from students.
    """

    class UserType(models.TextChoices):
        STUDENT = "student", "Student"
        TUTOR = "tutor", "Tutor"

    user_type = models.CharField(
        max_length=10,
        choices=UserType.choices,
        default=UserType.STUDENT,
    )
    avatar = models.URLField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        db_table = "users"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.username
