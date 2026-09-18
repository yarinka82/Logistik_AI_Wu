
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib import messages
from django.utils.translation import ngettext
from django.utils import timezone

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "email",
        "get_full_name",
        "role",
        "phone",
        "is_verified",
        "status_badge",
        "date_joined",
    )
    list_filter = ("role", "is_blocked", "is_verified")
    search_fields = ("email", "username", "phone", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login", "blocked_at")

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone")}),
        ("Role & status", {"fields": ("role", "is_verified", "is_blocked", "blocked_at")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "role", "password1", "password2"),
        }),
    )

    actions = ["block_users", "unblock_users"]

    @admin.display(description="Full name")
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    @admin.display(description="Status")
    def status_badge(self, obj):
        return "🔴 Blocked" if obj.is_blocked else "🟢 Active"

    @admin.action(description="Block selected users")
    def block_users(self, request, queryset):
        blocked_count = 0
        skipped_count = 0

        for user in queryset:
            if user.pk == request.user.pk or user.role == User.Role.ADMIN:
                skipped_count += 1
                continue
            user.is_blocked = True
            user.blocked_at = timezone.now()
            user.save(update_fields=["is_blocked", "blocked_at"])
            blocked_count += 1

        if blocked_count:
            self.message_user(
                request,
                ngettext(
                    "%d user blocked.",
                    "%d users blocked.",
                    blocked_count,
                ) % blocked_count,
                messages.SUCCESS,
            )
        if skipped_count:
            self.message_user(
                request,
                f"{skipped_count} skipped (own account or admin role).",
                messages.WARNING,
            )

    @admin.action(description="Unblock selected users")
    def unblock_users(self, request, queryset):
        updated = queryset.update(is_blocked=False, blocked_at=None)
        self.message_user(
            request,
            ngettext(
                "%d user unblocked.",
                "%d users unblocked.",
                updated,
            ) % updated,
            messages.SUCCESS,
        )