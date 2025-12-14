"""
Tests for tutors app filters.
"""

from decimal import Decimal

import pytest

from apps.tutors.filters import TutorFilter
from apps.tutors.models import Tutor

from .factories import TutorFactory


@pytest.mark.django_db
class TestTutorFilter:
    """Tests for TutorFilter."""

    def test_filter_by_min_price(self):
        """Filter tutors by minimum hourly rate."""
        TutorFactory(hourly_rate=Decimal("30.00"))
        tutor2 = TutorFactory(hourly_rate=Decimal("50.00"))
        tutor3 = TutorFactory(hourly_rate=Decimal("70.00"))

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"min_price": 50}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_by_max_price(self):
        """Filter tutors by maximum hourly rate."""
        tutor1 = TutorFactory(hourly_rate=Decimal("30.00"))
        tutor2 = TutorFactory(hourly_rate=Decimal("50.00"))
        TutorFactory(hourly_rate=Decimal("70.00"))

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"max_price": 50}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor1 in filterset.qs
        assert tutor2 in filterset.qs

    def test_filter_by_price_range(self):
        """Filter tutors by price range (min and max)."""
        TutorFactory(hourly_rate=Decimal("30.00"))
        tutor2 = TutorFactory(hourly_rate=Decimal("50.00"))
        tutor3 = TutorFactory(hourly_rate=Decimal("60.00"))
        TutorFactory(hourly_rate=Decimal("80.00"))

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"min_price": 40, "max_price": 70}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_by_subject(self):
        """Filter tutors by subject (JSON array contains)."""
        tutor1 = TutorFactory(subjects=["math", "physics"])
        tutor2 = TutorFactory(subjects=["math", "chemistry"])
        TutorFactory(subjects=["english", "literature"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"subject": "math"}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor1 in filterset.qs
        assert tutor2 in filterset.qs

    def test_filter_by_subject_case_sensitive(self):
        """Filter by subject is case-sensitive."""
        TutorFactory(subjects=["Math"])  # Capital M
        tutor2 = TutorFactory(subjects=["math"])  # Lowercase m

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"subject": "math"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor2 in filterset.qs

    def test_filter_by_nonexistent_subject(self):
        """Filter by non-existent subject returns empty."""
        TutorFactory(subjects=["math", "physics"])
        TutorFactory(subjects=["chemistry"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"subject": "biology"}, queryset=queryset)

        assert filterset.qs.count() == 0

    def test_filter_by_min_rating(self):
        """Filter tutors by minimum rating."""
        TutorFactory(rating=Decimal("3.0"))
        tutor2 = TutorFactory(rating=Decimal("4.5"))
        tutor3 = TutorFactory(rating=Decimal("4.8"))

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"min_rating": 4}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_by_format_online(self):
        """Filter tutors by online format."""
        tutor1 = TutorFactory(formats=["online"])
        tutor2 = TutorFactory(formats=["online", "offline"])
        TutorFactory(formats=["offline"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"format": "online"}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor1 in filterset.qs
        assert tutor2 in filterset.qs

    def test_filter_by_format_offline(self):
        """Filter tutors by offline format."""
        TutorFactory(formats=["online"])
        tutor2 = TutorFactory(formats=["online", "offline"])
        tutor3 = TutorFactory(formats=["offline"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"format": "offline"}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_by_location_contains(self):
        """Filter tutors by location (case-insensitive contains)."""
        tutor1 = TutorFactory(location="New York")
        tutor2 = TutorFactory(location="new york city")
        TutorFactory(location="Los Angeles")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"location": "new york"}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor1 in filterset.qs
        assert tutor2 in filterset.qs

    def test_filter_by_location_case_insensitive(self):
        """Location filter is case-insensitive."""
        tutor = TutorFactory(location="San Francisco")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"location": "san francisco"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_filter_by_is_verified(self):
        """Filter tutors by is_verified status."""
        TutorFactory(is_verified=False)
        tutor2 = TutorFactory(is_verified=True)
        tutor3 = TutorFactory(is_verified=True)

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"is_verified": True}, queryset=queryset)

        assert filterset.qs.count() == 2
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_by_search_query_first_name(self):
        """Full-text search filters by first name."""
        from apps.core.tests.factories import TutorUserFactory

        user = TutorUserFactory(first_name="John", last_name="Doe")
        tutor = TutorFactory(user=user)
        TutorFactory()  # Another tutor

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "John"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_filter_by_search_query_last_name(self):
        """Full-text search filters by last name."""
        from apps.core.tests.factories import TutorUserFactory

        user = TutorUserFactory(first_name="Jane", last_name="Smith")
        tutor = TutorFactory(user=user)
        TutorFactory()

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "Smith"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_filter_by_search_query_headline(self):
        """Full-text search filters by headline."""
        tutor = TutorFactory(headline="Expert Mathematics Tutor")
        TutorFactory(headline="English Teacher")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "Mathematics"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_filter_by_search_query_bio(self):
        """Full-text search filters by bio."""
        tutor = TutorFactory(bio="I specialize in quantum physics and advanced mathematics.")
        TutorFactory(bio="I teach English and literature.")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "quantum"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_filter_by_search_query_case_insensitive(self):
        """Full-text search is case-insensitive."""
        tutor = TutorFactory(headline="Expert Python Developer")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "python"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

        # Test with different case
        filterset = TutorFilter({"q": "PYTHON"}, queryset=queryset)
        assert filterset.qs.count() == 1

    def test_filter_by_search_query_partial_match(self):
        """Full-text search supports partial matches."""
        tutor = TutorFactory(headline="Mathematics and Statistics Expert")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "Math"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_combined_filters(self):
        """Multiple filters can be applied together."""
        tutor = TutorFactory(
            subjects=["math"],
            hourly_rate=Decimal("50.00"),
            rating=Decimal("4.5"),
            formats=["online"],
            is_verified=True,
        )
        # Create tutors that don't match all criteria
        TutorFactory(subjects=["math"], hourly_rate=Decimal("80.00"))  # Price too high
        TutorFactory(subjects=["english"], hourly_rate=Decimal("50.00"))  # Wrong subject
        TutorFactory(subjects=["math"], formats=["offline"])  # Wrong format

        queryset = Tutor.objects.all()
        filterset = TutorFilter(
            {
                "subject": "math",
                "min_price": 40,
                "max_price": 60,
                "format": "online",
                "is_verified": True,
            },
            queryset=queryset,
        )

        assert filterset.qs.count() == 1
        assert tutor in filterset.qs

    def test_empty_filters_returns_all(self):
        """No filters returns all tutors."""
        TutorFactory.create_batch(5)

        queryset = Tutor.objects.all()
        filterset = TutorFilter({}, queryset=queryset)

        assert filterset.qs.count() == 5

    def test_filter_meta_fields(self):
        """TutorFilter.Meta defines correct fields."""
        assert TutorFilter.Meta.model == Tutor
        expected_fields = [
            "is_verified",
            "min_price",
            "max_price",
            "min_rating",
            "subject",
            "format",
            "location",
        ]
        assert set(TutorFilter.Meta.fields) == set(expected_fields)

    def test_filter_by_search_query_matches_multiple_fields(self):
        """Search query can match any of the searchable fields."""
        from apps.core.tests.factories import TutorUserFactory

        # Tutor with "Python" in first name
        user1 = TutorUserFactory(first_name="Python", last_name="Expert")
        tutor1 = TutorFactory(user=user1, headline="Math Tutor")

        # Tutor with "Python" in headline
        tutor2 = TutorFactory(headline="Python Programming Expert")

        # Tutor with "Python" in bio
        tutor3 = TutorFactory(bio="I teach Python and JavaScript programming.")

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"q": "Python"}, queryset=queryset)

        assert filterset.qs.count() == 3
        assert tutor1 in filterset.qs
        assert tutor2 in filterset.qs
        assert tutor3 in filterset.qs

    def test_filter_with_empty_subjects_array(self):
        """Filter handles tutors with empty subjects array."""
        TutorFactory(subjects=[])
        tutor2 = TutorFactory(subjects=["math"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"subject": "math"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor2 in filterset.qs

    def test_filter_with_empty_formats_array(self):
        """Filter handles tutors with empty formats array."""
        TutorFactory(formats=[])
        tutor2 = TutorFactory(formats=["online"])

        queryset = Tutor.objects.all()
        filterset = TutorFilter({"format": "online"}, queryset=queryset)

        assert filterset.qs.count() == 1
        assert tutor2 in filterset.qs
