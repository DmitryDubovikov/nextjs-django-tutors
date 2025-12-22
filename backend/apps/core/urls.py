"""
Core app URL configuration.
"""

from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ConversionEventView,
    CredentialsLoginView,
    CredentialsRegisterView,
    CurrentUserView,
    ExposureEventView,
    FeatureFlagsView,
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
    # Credentials auth (enabled via ENABLE_CREDENTIALS_AUTH env var)
    path("auth/login/", CredentialsLoginView.as_view(), name="auth-login"),
    path("auth/register/", CredentialsRegisterView.as_view(), name="auth-register"),
    # Feature flags
    path("feature-flags/", FeatureFlagsView.as_view(), name="feature-flags"),
    # Analytics endpoints
    path("analytics/exposure/", ExposureEventView.as_view(), name="analytics-exposure"),
    path("analytics/conversion/", ConversionEventView.as_view(), name="analytics-conversion"),
]
