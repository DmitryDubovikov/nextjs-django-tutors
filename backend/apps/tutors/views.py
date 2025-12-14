"""
Views for tutors app.
"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Tutor, TutorDraft
from .serializers import TutorDetailSerializer, TutorDraftSerializer, TutorSerializer


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
