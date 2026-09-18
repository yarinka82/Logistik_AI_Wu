
from django.urls import path
from .views import UserAdminListView, UserBlockView, UserUnblockView

urlpatterns = [
    path("users/", UserAdminListView.as_view(), name="admin-users-list"),
    path("users/<int:pk>/block/", UserBlockView.as_view(), name="admin-user-block"),
    path("users/<int:pk>/unblock/", UserUnblockView.as_view(), name="admin-user-unblock"),
]