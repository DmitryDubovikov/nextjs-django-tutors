"""
URL configuration for chat API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatRoomViewSet

router = DefaultRouter()
router.register("chat/rooms", ChatRoomViewSet, basename="chat-room")

urlpatterns = [
    path("", include(router.urls)),
]
