"""
Core app URL configuration.
"""

from django.urls import path

from .views import FileUploadView

app_name = "core"

urlpatterns = [
    path("upload/", FileUploadView.as_view(), name="file-upload"),
]
