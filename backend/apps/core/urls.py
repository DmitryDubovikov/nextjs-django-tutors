"""
Core app URL configuration.
"""

from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserView,
    FileUploadView,
    GitHubAuthView,
    GoogleAuthView,
    LogoutView,
)

app_name = "core"

urlpatterns = [
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    # Auth endpoints
    path("auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("auth/github/", GitHubAuthView.as_view(), name="auth-github"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
]
