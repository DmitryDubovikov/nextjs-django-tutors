"""
Factory Boy factories for core app models.

Provides test data factories for User model.
"""

import factory
from factory.django import DjangoModelFactory

from apps.core.models import User


class UserFactory(DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    user_type = User.UserType.STUDENT
    avatar = factory.Faker("image_url")
    phone = factory.LazyFunction(lambda: "+1234567890")
    is_active = True


class TutorUserFactory(UserFactory):
    """Factory for User model with tutor user_type."""

    user_type = User.UserType.TUTOR


class StudentUserFactory(UserFactory):
    """Factory for User model with student user_type."""

    user_type = User.UserType.STUDENT


class AdminUserFactory(UserFactory):
    """Factory for User model with is_staff=True (business admin)."""

    is_staff = True
