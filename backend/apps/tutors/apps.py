"""
Tutors app configuration.
"""

from django.apps import AppConfig


class TutorsConfig(AppConfig):
    """Configuration for the tutors app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tutors"
    verbose_name = "Tutors"
