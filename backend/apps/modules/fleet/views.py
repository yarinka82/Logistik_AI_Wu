from datetime import timezone

from rest_framework.decorators import action
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import DriverProfile
from users.permissions import IsCarrierOwner, IsOwnDriverProfile
from .models import Vehicle
from .serializers import VehicleSerializer, StaffDriverListSerializer, CarrierCompanyListSerializer, \
    DriverProfileSerializer


class IsCarrierCompany(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "driver_profile", None)
            and request.user.driver_profile.is_carrier_company
        )


class StaffDriverViewSet(viewsets.ModelViewSet):
    serializer_class = StaffDriverListSerializer
    permission_classes = [IsAuthenticated, IsCarrierOwner]
    http_method_names = ["get", "post", "head"]  # без create — тут "post" только под @action

    def get_queryset(self):
        qs = DriverProfile.objects.filter(employer=self.request.user.driver_profile)
        status_param = self.request.query_params.get("status")
        if status_param == "pending":
            qs = qs.filter(is_confirmed_by_employer=False)
        elif status_param == "confirmed":
            qs = qs.filter(is_confirmed_by_employer=True)
        return qs
    
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        driver = self.get_object()
        driver.is_confirmed_by_employer = True
        driver.confirmed_at = timezone.now()
        driver.save(update_fields=["is_confirmed_by_employer", "confirmed_at"])
        return Response(status=204)
    
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        driver = self.get_object()
        driver.employer = None
        driver.driver_type = ""  # сброс — save() пересчитает в self_employed
        driver.is_confirmed_by_employer = False
        driver.save(update_fields=["employer", "driver_type", "is_confirmed_by_employer"])
        return Response(status=204)
    
    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        driver = self.get_object()
        driver.employer = None
        driver.driver_type = ""
        driver.is_confirmed_by_employer = False
        driver.confirmed_at = None
        driver.save(update_fields=["employer", "driver_type", "is_confirmed_by_employer", "confirmed_at"])
        return Response(status=204)



class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsCarrierCompany]

    def get_queryset(self):
        return Vehicle.objects.filter(carrier=self.request.user).select_related("assigned_driver")

    def perform_create(self, serializer):
        serializer.save(carrier=self.request.user)



class DriverProfileViewSet(viewsets.ModelViewSet):
    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated, IsOwnDriverProfile]

    def get_queryset(self):
        return DriverProfile.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=["post"])
    def request_join(self, request, pk=None):
        profile = self.get_object()
        if profile.employer_id:
            raise ValidationError("Ви вже пов'язані з перевізником або маєте активний запит.")
        
        employer_id = request.data.get("employer_id")
        try:
            employer = DriverProfile.objects.get(pk=employer_id, is_carrier_company=True)
        except DriverProfile.DoesNotExist:
            raise ValidationError({"employer_id": "Перевізника не знайдено."})
        
        profile.employer = employer
        profile.driver_type = ""  # сброс — save() пересчитает в company_employee
        profile.is_confirmed_by_employer = False
        profile.confirmed_at = None
        profile.save(update_fields=["employer", "driver_type", "is_confirmed_by_employer", "confirmed_at"])
        return Response(status=204)
    
    @action(detail=True, methods=["post"])
    def cancel_request(self, request, pk=None):
        profile = self.get_object()
        if profile.is_confirmed_by_employer:
            raise ValidationError("Заявку вже підтверджено — скористайтесь виходом з компанії.")
        profile.employer = None
        profile.driver_type = ""  # сброс — save() пересчитает в self_employed
        profile.save(update_fields=["employer", "driver_type"])
        return Response(status=204)
    
    @action(detail=True, methods=["post"])
    def leave_company(self, request, pk=None):
        profile = self.get_object()
        profile.employer = None
        profile.driver_type = ""
        profile.is_confirmed_by_employer = False
        profile.confirmed_at = None
        profile.save(update_fields=["employer", "driver_type", "is_confirmed_by_employer", "confirmed_at"])
        return Response(status=204)
    
    

class ConfirmStaffDriverView(APIView):
    """PATCH /fleet/staff-drivers/{id}/confirm/ — руководитель подтверждает водителя."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        owner_profile = request.user.driver_profile
        if not owner_profile.is_carrier_company:
            raise PermissionDenied("Тільки компанія-перевізник може підтверджувати водіїв.")

        driver = get_object_or_404(DriverProfile, pk=pk, employer=owner_profile)
        driver.is_confirmed_by_employer = True
        driver.confirmed_at = timezone.now()
        driver.save(update_fields=["is_confirmed_by_employer", "confirmed_at"])
        return Response(StaffDriverListSerializer(driver).data)
    


class CarrierCompanyListViewSet(viewsets.ReadOnlyModelViewSet):
    """Публічний список перевізників-компаній для подання заявки."""
    serializer_class = CarrierCompanyListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DriverProfile.objects.filter(is_carrier_company=True)