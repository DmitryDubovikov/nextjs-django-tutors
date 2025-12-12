"""
Admin configuration for core app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom user admin with additional fields."""

    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "user_type",
        "is_staff",
    )
    list_filter = (*BaseUserAdmin.list_filter, "user_type")
    fieldsets = (
        *BaseUserAdmin.fieldsets,
        ("Profile", {"fields": ("user_type", "avatar", "phone")}),
    )
    add_fieldsets = (
        *BaseUserAdmin.add_fieldsets,
        ("Profile", {"fields": ("user_type", "avatar", "phone")}),
    )
