
from rest_framework import viewsets, permissions, views, response, status
from users.models import DriverProfile
from .models import DriverInvite, Vehicle
from .serializers import StaffDriverSerializer, DriverInviteSerializer, VehicleSerializer, StaffDriverUpdateSerializer


class IsCarrierCompany(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "driver_profile", None)
            and request.user.driver_profile.is_carrier_company
        )


class StaffDriverViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCarrierCompany]
    http_method_names = ["get", "patch", "delete", "head"]

    def get_queryset(self):
        return DriverProfile.objects.filter(employer=self.request.user.driver_profile)

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return StaffDriverUpdateSerializer
        return StaffDriverSerializer

    def perform_destroy(self, instance):
        instance.employer = None
        instance.save(update_fields=["employer"])


class DriverInviteViewSet(viewsets.ModelViewSet):
    serializer_class = DriverInviteSerializer
    permission_classes = [IsCarrierCompany]
    http_method_names = ["get", "post", "head"]

    def get_queryset(self):
        return DriverInvite.objects.filter(company=self.request.user)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsCarrierCompany]

    def get_queryset(self):
        return Vehicle.objects.filter(carrier=self.request.user).select_related("assigned_driver")

    def perform_create(self, serializer):
        serializer.save(carrier=self.request.user)


class ValidateInviteView(views.APIView):
    """Публічний ендпоінт: перевірити код запрошення під час реєстрації."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.query_params.get("code", "")
        try:
            invite = DriverInvite.objects.select_related("company__driver_profile").get(code=code)
        except DriverInvite.DoesNotExist:
            return response.Response({"valid": False}, status=status.HTTP_404_NOT_FOUND)
        if not invite.is_valid():
            return response.Response({"valid": False}, status=status.HTTP_410_GONE)
        return response.Response({
            "valid": True,
            "company_name": invite.company.driver_profile.full_name,
        })