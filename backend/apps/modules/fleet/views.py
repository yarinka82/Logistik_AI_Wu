from django.utils import timezone

from rest_framework.decorators import action
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import DriverProfile, CarrierCompanyProfile
from users.permissions import IsOwnDriverProfile, IsCarrierCompany
from .models import Vehicle
from .serializers import VehicleSerializer, StaffDriverListSerializer, CarrierCompanyListSerializer, \
    DriverProfileSerializer


class StaffDriverViewSet(viewsets.ModelViewSet):
    """Панель владельца компании для управления водителями."""

    serializer_class = StaffDriverListSerializer
    permission_classes = [IsAuthenticated, IsCarrierCompany]
    http_method_names = ["get", "post", "head"]

    def get_queryset(self):
        carrier = getattr(self.request.user, "carrier_company_profile", None)
        if not carrier:
            return DriverProfile.objects.none()

        qs = DriverProfile.objects.filter(employer=carrier).select_related(
            "user"
        )
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
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        driver = self.get_object()
        driver.employer = None
        driver.driver_type = ""
        driver.is_confirmed_by_employer = False
        driver.save(
            update_fields=[
                "employer",
                "driver_type",
                "is_confirmed_by_employer",
            ]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        driver = self.get_object()
        # Снимаем водителя с закрепленного за ним транспорта компании
        Vehicle.objects.filter(assigned_driver=driver).update(
            assigned_driver=None
        )

        driver.employer = None
        driver.driver_type = ""
        driver.is_confirmed_by_employer = False
        driver.confirmed_at = None
        driver.save(
            update_fields=[
                "employer",
                "driver_type",
                "is_confirmed_by_employer",
                "confirmed_at",
            ]
        )
        return Response(status=status.HTTP_204_NO_CONTENT)



class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, IsCarrierCompany]

    def get_queryset(self):
        carrier = getattr(self.request.user, "carrier_company_profile", None)
        if not carrier:
            return Vehicle.objects.none()
        # carrier у Vehicle — это FK на User, а не на CarrierCompanyProfile
        return Vehicle.objects.filter(carrier=self.request.user).select_related("assigned_driver")

    def perform_create(self, serializer):
        serializer.save(carrier=self.request.user)



class DriverProfileViewSet(viewsets.GenericViewSet):
    """Действия текущего авторизованного водителя со своим профилем."""

    serializer_class = DriverProfileSerializer
    permission_classes = [IsAuthenticated]

    def _get_driver_profile(self, user):
        # Получаем или создаем профиль водителя, если его вдруг нет
        profile, _ = DriverProfile.objects.get_or_create(user=user)
        return profile

    @action(detail=False, methods=["post"], url_path="request-join")
    def request_join(self, request):
        profile = self._get_driver_profile(request.user)

        if profile.employer_id and profile.is_confirmed_by_employer:
            raise ValidationError("Ви вже перебуваєте у штаті компанії.")

        company_id = request.data.get("company_id")
        if not company_id:
            raise ValidationError({"company_id": "Оберіть компанію."})

        try:
            company = CarrierCompanyProfile.objects.get(pk=company_id)
        except CarrierCompanyProfile.DoesNotExist:
            raise ValidationError({"company_id": "Компанію не знайдено."})

        profile.employer = company
        profile.driver_type = ""
        profile.is_confirmed_by_employer = False
        profile.confirmed_at = None
        profile.save(
            update_fields=[
                "employer",
                "driver_type",
                "is_confirmed_by_employer",
                "confirmed_at",
            ]
        )
        return Response(
            {"detail": "Заявку успішно надіслано"},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="cancel-request")
    def cancel_request(self, request):
        profile = self._get_driver_profile(request.user)
        if profile.is_confirmed_by_employer:
            raise ValidationError(
                "Заявку вже підтверджено — скористайтесь виходом з компанії."
            )

        profile.employer = None
        profile.driver_type = ""
        profile.save(update_fields=["employer", "driver_type"])
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="leave-company")
    def leave_company(self, request):
        profile = self._get_driver_profile(request.user)
        profile.employer = None
        profile.driver_type = ""
        profile.is_confirmed_by_employer = False
        profile.confirmed_at = None
        profile.save(
            update_fields=[
                "employer",
                "driver_type",
                "is_confirmed_by_employer",
                "confirmed_at",
            ]
        )
        return Response(status=status.HTTP_200_OK)



class CarrierCompanyListViewSet(viewsets.ReadOnlyModelViewSet):
    """Список компаний для поиска и подачи заявки водителем."""

    serializer_class = CarrierCompanyListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CarrierCompanyProfile.objects.all()



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
    


