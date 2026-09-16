
from rest_framework.routers import DefaultRouter
from .views import StaffDriverViewSet, VehicleViewSet

router = DefaultRouter()
router.register("drivers", StaffDriverViewSet, basename="staff-driver")
router.register("vehicles", VehicleViewSet, basename="vehicle")

urlpatterns = router.urls