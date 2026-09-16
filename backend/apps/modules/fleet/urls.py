
from rest_framework.routers import DefaultRouter
from .views import (
    CarrierCompanyListViewSet,
    DriverProfileViewSet,
    StaffDriverViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register("staff-drivers", StaffDriverViewSet, basename="staff-driver")
router.register(
    "driver-profiles", DriverProfileViewSet, basename="driver-profile"
)
router.register(
    "carrier-companies",
    CarrierCompanyListViewSet,
    basename="carrier-company-list",
)
router.register("vehicles", VehicleViewSet, basename="vehicle")

urlpatterns = router.urls