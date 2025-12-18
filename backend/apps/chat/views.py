"""
REST API views for chat functionality.
"""

from django.db.models import Count, Prefetch, Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import ChatRoom, Message
from .serializers import (
    ChatRoomSerializer,
    CreateChatRoomSerializer,
    MessageSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List user's chat rooms",
        description="Returns all chat rooms where the current user is either tutor or student.",
    ),
    retrieve=extend_schema(
        summary="Get chat room details",
        description="Returns details of a specific chat room if the user has access.",
    ),
    create=extend_schema(
        summary="Create or get chat room",
        description="Creates a new chat room with a tutor or returns existing one.",
        responses={201: ChatRoomSerializer},
    ),
)
class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        user = self.request.user

        return (
            ChatRoom.objects.filter(Q(tutor=user) | Q(student=user))
            .select_related("tutor", "student")
            .prefetch_related(
                Prefetch(
                    "messages",
                    queryset=Message.objects.order_by("-created_at")[:1],
                    to_attr="last_message_list",
                )
            )
            .annotate(
                unread_count_annotated=Count(
                    "messages", filter=Q(messages__is_read=False) & ~Q(messages__sender=user)
                )
            )
            .order_by("-updated_at")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return CreateChatRoomSerializer
        return ChatRoomSerializer

    def create(self, request: Request) -> Response:
        serializer = CreateChatRoomSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(
            ChatRoomSerializer(room, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        summary="Get messages for a chat room",
        description="Returns paginated message history for the specified chat room.",
    )
    @action(detail=True, methods=["get"])
    def messages(self, request: Request, pk=None) -> Response:
        room = self.get_object()
        messages = Message.objects.filter(room=room).select_related("sender").order_by("created_at")

        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Mark messages as read",
        description="Marks all unread messages in the chat room as read for the current user.",
    )
    @action(detail=True, methods=["post"])
    def mark_read(self, request: Request, pk=None) -> Response:
        room = self.get_object()
        updated = (
            Message.objects.filter(room=room, is_read=False)
            .exclude(sender=request.user)
            .update(is_read=True)
        )
        return Response({"marked_read": updated})
