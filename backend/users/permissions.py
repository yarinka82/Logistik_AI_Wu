
from rest_framework import permissions


class IsCarrierCompany(permissions.BasePermission):
    """Доступ только для компаний-перевозчиков."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "carrier_company_profile")
        )


class IsOwnDriverProfile(permissions.BasePermission):
    """Водитель может управлять только своим профилем."""

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user