"""
Views for tutors app.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from .filters import TutorFilter
from .models import Tutor, TutorDraft
from .serializers import TutorDetailSerializer, TutorDraftSerializer, TutorSerializer


@extend_schema_view(
    list=extend_schema(
        summary="List all tutors",
        description="Returns a paginated list of all tutors with filtering and sorting.",
        tags=["tutors"],
        parameters=[
            OpenApiParameter(
                name="q",
                description="Search query for name, headline, or bio",
                type=str,
            ),
            OpenApiParameter(
                name="subject",
                description="Filter by subject (e.g., 'math', 'physics')",
                type=str,
            ),
            OpenApiParameter(
                name="min_price",
                description="Minimum hourly rate",
                type=int,
            ),
            OpenApiParameter(
                name="max_price",
                description="Maximum hourly rate",
                type=int,
            ),
            OpenApiParameter(
                name="min_rating",
                description="Minimum rating (0-5)",
                type=float,
            ),
            OpenApiParameter(
                name="format",
                description="Teaching format: 'online' or 'offline'",
                type=str,
            ),
            OpenApiParameter(
                name="location",
                description="Location filter (partial match)",
                type=str,
            ),
            OpenApiParameter(
                name="ordering",
                description="Sort by: 'rating', '-rating', 'hourly_rate', '-hourly_rate', '-created_at'",
                type=str,
            ),
        ],
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
    Supports filtering by subject, price range, rating, format, and location.
    Supports sorting by rating, price, and creation date.
    """

    queryset = Tutor.objects.select_related("user").all()
    serializer_class = TutorSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TutorFilter
    ordering_fields = ["rating", "hourly_rate", "created_at", "reviews_count"]
    ordering = ["-rating"]  # Default ordering
    lookup_field = "pk"

    def get_serializer_class(self):
        """Return the appropriate serializer class based on action."""
        if self.action == "retrieve":
            return TutorDetailSerializer
        return TutorSerializer

    @extend_schema(
        summary="Get tutor by slug",
        description="Returns detailed information about a specific tutor by their slug.",
        tags=["tutors"],
    )
    @action(detail=False, methods=["get"], url_path="by-slug/(?P<slug>[^/.]+)")
    def by_slug(self, request, slug=None):
        """Retrieve a tutor by their slug."""
        try:
            tutor = Tutor.objects.select_related("user").get(slug=slug)
            serializer = TutorDetailSerializer(tutor)
            return Response(serializer.data)
        except Tutor.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)


@extend_schema_view(
    list=extend_schema(
        summary="Get current user's draft",
        description="Returns the current user's tutor profile draft, if any.",
        tags=["tutor-drafts"],
    ),
    create=extend_schema(
        summary="Create or update draft",
        description="Creates a new draft or updates an existing one for the current user.",
        tags=["tutor-drafts"],
    ),
    destroy=extend_schema(
        summary="Delete draft",
        description="Deletes the current user's draft.",
        tags=["tutor-drafts"],
    ),
)
class TutorDraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tutor profile drafts.

    Allows authenticated users to save and retrieve their profile drafts.
    Each user can only have one draft at a time.
    """

    serializer_class = TutorDraftSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return drafts for the current user only."""
        return TutorDraft.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """Get the current user's draft (returns single object or empty)."""
        try:
            draft = TutorDraft.objects.get(user=request.user)
            serializer = self.get_serializer(draft)
            return Response(serializer.data)
        except TutorDraft.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        """Create or update the current user's draft."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        draft = serializer.save()
        return Response(
            self.get_serializer(draft).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Clear draft",
        description="Deletes the current user's draft.",
        tags=["tutor-drafts"],
    )
    @action(detail=False, methods=["delete"])
    def clear(self, request):
        """Delete the current user's draft."""
        deleted, _ = TutorDraft.objects.filter(user=request.user).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"detail": "No draft found"},
            status=status.HTTP_404_NOT_FOUND,
        )
