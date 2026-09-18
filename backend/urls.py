
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/fleet/', include('apps.modules.fleet.urls')),
    path('api/admin/', include('users.admin_urls')),
]
