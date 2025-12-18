"""
URL configuration for Tutors Marketplace project.
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # API endpoints
    path("api/", include("apps.core.urls")),
    path("api/", include("apps.tutors.urls")),
    path("api/", include("apps.bookings.urls")),
    path("api/", include("apps.chat.urls")),
    path("api/", include("apps.payments.urls")),
]
