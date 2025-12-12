"""
URL configuration for tutors app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TutorViewSet

router = DefaultRouter()
router.register(r"tutors", TutorViewSet, basename="tutor")

urlpatterns = [
    path("", include(router.urls)),
]
