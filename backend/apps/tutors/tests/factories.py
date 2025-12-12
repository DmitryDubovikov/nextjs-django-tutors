"""
Factory Boy factories for tutors app models.

Provides test data factories for Tutor model.
"""

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from apps.core.tests.factories import TutorUserFactory
from apps.tutors.models import Tutor


class TutorFactory(DjangoModelFactory):
    """Factory for Tutor model."""

    class Meta:
        model = Tutor

    user = factory.SubFactory(TutorUserFactory)
    headline = factory.Faker(
        "sentence",
        nb_words=6,
        variable_nb_words=True,
    )
    bio = factory.Faker("paragraph", nb_sentences=5)
    hourly_rate = factory.LazyFunction(lambda: Decimal("50.00"))
    subjects = ["math", "physics"]
    is_verified = False


class VerifiedTutorFactory(TutorFactory):
    """Factory for verified Tutor."""

    is_verified = True


class MathTutorFactory(TutorFactory):
    """Factory for Math Tutor."""

    headline = "Expert Mathematics Tutor"
    subjects = ["math", "algebra", "calculus"]
    hourly_rate = Decimal("50.00")
