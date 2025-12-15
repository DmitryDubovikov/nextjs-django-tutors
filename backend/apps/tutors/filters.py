"""
Filters for tutors app.

Provides filtering capabilities for tutor listings.
"""

import django_filters

from .models import Tutor


class TutorFilter(django_filters.FilterSet):
    """
    Filter class for Tutor model.

    Supports filtering by:
    - Price range (min_price, max_price)
    - Subject
    - Rating (minimum)
    - Format (online, offline)
    - Location
    - Search query (q) for full-text search
    """

    min_price = django_filters.NumberFilter(field_name="hourly_rate", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="hourly_rate", lookup_expr="lte")
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")
    subject = django_filters.CharFilter(method="filter_by_subject")
    format = django_filters.CharFilter(method="filter_by_format")
    location = django_filters.CharFilter(lookup_expr="icontains")
    q = django_filters.CharFilter(method="filter_by_search")

    class Meta:
        model = Tutor
        fields = [
            "is_verified",
            "min_price",
            "max_price",
            "min_rating",
            "subject",
            "format",
            "location",
        ]

    def filter_by_subject(self, queryset, name, value):
        """Filter tutors by subject (JSON array contains)."""
        return queryset.filter(subjects__contains=[value])

    def filter_by_format(self, queryset, name, value):
        """Filter tutors by teaching format (JSON array contains)."""
        return queryset.filter(formats__contains=[value])

    def filter_by_search(self, queryset, name, value):
        """Full-text search across name, headline, and bio."""
        from django.db.models import Q

        return queryset.filter(
            Q(user__first_name__icontains=value)
            | Q(user__last_name__icontains=value)
            | Q(headline__icontains=value)
            | Q(bio__icontains=value)
        )
