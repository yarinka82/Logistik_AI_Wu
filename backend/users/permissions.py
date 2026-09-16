
from rest_framework.permissions import BasePermission


class IsCarrierOwner(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "driver_profile", None)
        return bool(profile and profile.is_carrier_company)
    
    
class IsOwnDriverProfile(BasePermission):
    """Редактирование/удаление собственного профиля — только сам водитель."""
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id