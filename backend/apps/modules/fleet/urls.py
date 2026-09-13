
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import StaffDriverViewSet, DriverInviteViewSet, VehicleViewSet, ValidateInviteView

router = DefaultRouter()
router.register("drivers", StaffDriverViewSet, basename="staff-driver")
router.register("invites", DriverInviteViewSet, basename="driver-invite")
router.register("vehicles", VehicleViewSet, basename="vehicle")

urlpatterns = [
    path("invites/validate/", ValidateInviteView.as_view()),
    *router.urls,
]