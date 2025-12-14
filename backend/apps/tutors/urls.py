"""
URL configuration for tutors app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TutorDraftViewSet, TutorViewSet

router = DefaultRouter()
router.register(r"tutors", TutorViewSet, basename="tutor")
router.register(r"tutor-drafts", TutorDraftViewSet, basename="tutor-draft")

urlpatterns = [
    path("", include(router.urls)),
]
