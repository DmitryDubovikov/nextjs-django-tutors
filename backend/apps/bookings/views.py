"""
Views for bookings app.
"""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import Booking
from .serializers import BookingSerializer, CreateBookingSerializer


@extend_schema_view(
    list=extend_schema(
        summary="List user's bookings",
        description="Returns bookings for the authenticated user. "
        "Tutors see bookings where they are the tutor, "
        "students see their own bookings.",
        tags=["bookings"],
    ),
    create=extend_schema(
        summary="Create a booking",
        description="Create a new booking with a tutor. "
        "Price is automatically calculated based on tutor's hourly rate.",
        tags=["bookings"],
    ),
    retrieve=extend_schema(
        summary="Get booking details",
        description="Returns detailed information about a specific booking.",
        tags=["bookings"],
    ),
)
class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings.

    Provides list, create, retrieve, and custom actions.
    Update and delete are disabled.
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]  # Disable PUT, PATCH, DELETE

    def get_queryset(self):
        """Return bookings based on user type."""
        user = self.request.user
        # Check if user has a tutor profile
        if hasattr(user, "tutor_profile"):
            return Booking.objects.filter(tutor__user=user).select_related("tutor__user", "student")
        return Booking.objects.filter(student=user).select_related("tutor__user", "student")

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return CreateBookingSerializer
        return BookingSerializer

    def create(self, request, *args, **kwargs):
        """Create a booking and return full serialized data."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        # Return full booking data with BookingSerializer
        output_serializer = BookingSerializer(booking)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Cancel a booking",
        description="Cancel a pending or confirmed booking. "
        "Both tutors and students can cancel their bookings.",
        tags=["bookings"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()

        if booking.status not in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
            return Response(
                {"error": "Cannot cancel this booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CANCELLED
        booking.save()
        return Response(BookingSerializer(booking).data)

    @extend_schema(
        summary="Confirm a booking",
        description="Confirm a pending booking. Only the tutor can confirm bookings.",
        tags=["bookings"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Confirm a booking (tutor only)."""
        booking = self.get_object()

        # Check if the current user is the tutor for this booking
        if request.user != booking.tutor.user:
            return Response(
                {"error": "Only the tutor can confirm this booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.PENDING:
            return Response(
                {"error": "Can only confirm pending bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CONFIRMED
        booking.save()
        return Response(BookingSerializer(booking).data)

    @extend_schema(
        summary="Complete a booking",
        description="Mark a confirmed booking as completed. Only the tutor can complete bookings.",
        tags=["bookings"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark a booking as completed (tutor only)."""
        booking = self.get_object()

        # Check if the current user is the tutor for this booking
        if request.user != booking.tutor.user:
            return Response(
                {"error": "Only the tutor can complete this booking"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status != Booking.Status.CONFIRMED:
            return Response(
                {"error": "Can only complete confirmed bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.COMPLETED
        booking.save()
        return Response(BookingSerializer(booking).data)


@extend_schema_view(
    list=extend_schema(
        summary="List all bookings (admin)",
        description="Returns all bookings in the system. Requires staff permissions.",
        tags=["admin"],
    ),
    retrieve=extend_schema(
        summary="Get booking details (admin)",
        description="Returns detailed information about a specific booking. Requires staff permissions.",
        tags=["admin"],
    ),
)
class AdminBookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin management of all bookings.

    Requires is_staff=True. Provides full CRUD access to all bookings.
    """

    permission_classes = [IsAdminUser]
    queryset = Booking.objects.all().select_related("tutor__user", "student")
    serializer_class = BookingSerializer
    http_method_names = ["get", "post", "head", "options"]

    @extend_schema(
        summary="Cancel a booking (admin)",
        description="Admin can cancel any pending or confirmed booking.",
        tags=["admin"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a booking (admin)."""
        booking = self.get_object()

        if booking.status not in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
            return Response(
                {"error": "Cannot cancel this booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CANCELLED
        booking.save()
        return Response(BookingSerializer(booking).data)

    @extend_schema(
        summary="Confirm a booking (admin)",
        description="Admin can confirm any pending booking.",
        tags=["admin"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Confirm a booking (admin)."""
        booking = self.get_object()

        if booking.status != Booking.Status.PENDING:
            return Response(
                {"error": "Can only confirm pending bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.CONFIRMED
        booking.save()
        return Response(BookingSerializer(booking).data)

    @extend_schema(
        summary="Complete a booking (admin)",
        description="Admin can mark any confirmed booking as completed.",
        tags=["admin"],
        responses={200: BookingSerializer},
    )
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark a booking as completed (admin)."""
        booking = self.get_object()

        if booking.status != Booking.Status.CONFIRMED:
            return Response(
                {"error": "Can only complete confirmed bookings"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = Booking.Status.COMPLETED
        booking.save()
        return Response(BookingSerializer(booking).data)
