"""
Celery configuration for Tutors Marketplace.

This module configures Celery for async task processing (e.g., payment simulation).
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("tutors")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()
