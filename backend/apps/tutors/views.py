"""
Views for tutors app.
"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Tutor
from .serializers import TutorDetailSerializer, TutorSerializer


@extend_schema_view(
    list=extend_schema(
        summary="List all tutors",
        description="Returns a paginated list of all tutors.",
        tags=["tutors"],
    ),
    retrieve=extend_schema(
        summary="Get tutor details",
        description="Returns detailed information about a specific tutor.",
        tags=["tutors"],
    ),
)
class TutorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving tutors.

    Provides list and retrieve operations for tutors.
    Authentication is not required for read operations.
    """

    queryset = Tutor.objects.select_related("user").all()
    serializer_class = TutorSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        """Return the appropriate serializer class based on action."""
        if self.action == "retrieve":
            return TutorDetailSerializer
        return TutorSerializer
