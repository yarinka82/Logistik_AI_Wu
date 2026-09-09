from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, CustomTokenView, MeView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", CustomTokenView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("me/", MeView.as_view()),
]