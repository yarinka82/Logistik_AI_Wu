
from rest_framework import permissions
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.ADMIN
        )
    

class IsCarrierCompany(permissions.BasePermission):
    """Carrier-only access."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "carrier_company_profile")
        )


class IsOwnDriverProfile(permissions.BasePermission):
    """The driver can only manage their profile."""

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user