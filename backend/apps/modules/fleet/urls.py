
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


'''
/api/fleet/staff-drivers/	GET	fetchDriversRequest	Список водителей компании
/api/fleet/staff-drivers/{id}/	GET	fetchDriverRequest	Детальная карточка водителя
/api/fleet/staff-drivers/{id}/	PATCH	updateDriverRequest	Редактирование данных водителя
/api/fleet/staff-drivers/{id}/approve/	POST	approveDriverRequest	Принять водителя в штат
/api/fleet/staff-drivers/{id}/reject/	POST	rejectDriverRequest	Отклонить заявку водителя
/api/fleet/staff-drivers/{id}/dismiss/	POST	dismissDriverRequest	Открепить / уволить водителя
/api/fleet/carrier-companies/	GET	fetchCarrierCompaniesRequest	Список компаний для выбора
/api/fleet/driver-profiles/request-join/	POST	requestJoinCompanyRequest	Подать заявку в компанию
/api/fleet/driver-profiles/cancel-request/	POST	cancelJoinRequestRequest	Отменить заявку
/api/fleet/driver-profiles/leave-company/	POST	leaveCompanyRequest	Покинуть компанию
/api/fleet/vehicles/	GET	fetchVehiclesRequest	Список транспорта автопарка
/api/fleet/vehicles/	POST	createVehicleRequest	Добавить автомобиль
/api/fleet/vehicles/{id}/	GET	fetchVehicleRequest	Детали автомобиля
/api/fleet/vehicles/{id}/	PATCH	updateVehicleRequest	Обновить автомобиль / назначить водителя
/api/fleet/vehicles/{id}/	DELETE	deleteVehicleRequest	Удалить автомобиль

'''