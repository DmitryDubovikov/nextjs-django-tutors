"""
Django project configuration.

This module exposes the Celery app for Django integration.
"""

from config.celery import app as celery_app

__all__ = ("celery_app",)
