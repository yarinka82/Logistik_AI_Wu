
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        CLIENT_COMPANY = "client_company", "Замовник — фірма"
        CLIENT_INDIVIDUAL = "client_individual", "Замовник — фізична особа"
        DRIVER = "driver", "Водій / перевізник"
        ACCOUNTANT = "accountant", "Бухгалтер"
        ADMIN = "admin", "Адміністратор системи"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_verified = models.BooleanField(default=False)  # confirmed by admin


    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "role"]


class ClientCompanyProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="company_profile")
    company_name = models.CharField(max_length=255)
    edrpou = models.CharField(max_length=10, unique=True)
    legal_address = models.CharField(max_length=500, blank=True)


class ClientIndividualProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="individual_profile")
    full_name = models.CharField(max_length=255)


class DriverProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="driver_profile")
    full_name = models.CharField(max_length=255)
    driver_license_number = models.CharField(max_length=50)
    vehicle_info = models.CharField(max_length=255, blank=True)
    is_carrier_company = models.BooleanField(default=False)  # the sole proprietor / carrier or the company itself



class AccountantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="accountant_profile")
    full_name = models.CharField(max_length=255)
    company = models.ForeignKey(ClientCompanyProfile, on_delete=models.SET_NULL, null=True, blank=True)