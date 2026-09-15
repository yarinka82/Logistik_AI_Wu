from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
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
    edrpou = models.CharField(max_length=15, unique=True)
    legal_address = models.CharField(max_length=500, blank=True)


class ClientIndividualProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="individual_profile")
    full_name = models.CharField(max_length=255)


class DriverProfile(models.Model):
    
    class DriverType(models.TextChoices):
        SELF_EMPLOYED = 'self_employed', 'Sole Proprietorship (Gewerbe / Solo-Selbstständige)'
        COMPANY_EMPLOYEE = 'company_employee', 'Fleet Company Staff Driver'

    class DriverStatus(models.TextChoices):
        AVAILABLE = 'available', 'Free to Accept Orders'
        ON_TRIP = 'on_trip', 'On Duty / Executing Delivery'
        OFF_DUTY = 'off_duty', 'Rest Period / Mandatory Break'
        INACTIVE = 'inactive', 'Account Blocked or Suspended'
        
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="driver_profile")
    full_name = models.CharField(max_length=255)
    driver_license_number = models.CharField(max_length=50, blank=True)
    vehicle_info = models.CharField(max_length=255, blank=True)
    license_photo = models.FileField(upload_to="driver_licenses/", blank=True, null=True)

    is_carrier_company = models.BooleanField(default=False)
    also_drives = models.BooleanField(default=True)

    employer = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="staff_drivers",
        limit_choices_to={"is_carrier_company": True},
    )
    driver_ref = models.CharField(
        max_length=32, unique=True, null=True, blank=True,
        help_text="Внешний ID для аналитики, формат DR-####",
    )
    base_city = models.CharField(max_length=100, blank=True)
    driving_license_categories = models.CharField(
        max_length=50, blank=True, help_text="B, BE, C1, C1E, C, CE",
    )
    driving_license_expiry_date = models.DateField(null=True, blank=True)
    code_95_categories = models.CharField(
        max_length=50, null=True, blank=True, help_text="EU Code 95 (BKrFQG)",
    )
    code_95_expiry_date = models.DateField(null=True, blank=True)
    has_adr = models.BooleanField(default=False)
    adr_expiry_date = models.DateField(null=True, blank=True)
    avg_customer_rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=5.00,
        validators=[MinValueValidator(1.00), MaxValueValidator(5.00)],
    )
    total_reviews_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    service_compliance_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(100.00)],
    )
    default_vehicle = models.ForeignKey(
        "fleet.Vehicle", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="default_for_drivers",
    )
    is_test = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(avg_customer_rating__gte=1.00) & models.Q(avg_customer_rating__lte=5.00),
                name="chk_driver_rating_range",
            ),
            models.CheckConstraint(
                condition=models.Q(total_reviews_count__gte=0),
                name="chk_driver_reviews_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(service_compliance_rate__gte=0.00) & models.Q(service_compliance_rate__lte=100.00),
                name="chk_driver_compliance_range",
            ),
            models.CheckConstraint(
                condition=(
                        (models.Q(code_95_categories__isnull=True) & models.Q(code_95_expiry_date__isnull=True)) |
                        (models.Q(code_95_categories__isnull=False) & models.Q(code_95_expiry_date__isnull=False))
                ),
                name="chk_driver_code95_consistency",
            ),
            models.CheckConstraint(
                condition=(
                        (models.Q(has_adr=False) & models.Q(adr_expiry_date__isnull=True)) |
                        (models.Q(has_adr=True) & models.Q(adr_expiry_date__isnull=False))
                ),
                name="chk_driver_adr_consistency",
            ),
        ]



class AccountantProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="accountant_profile")
    full_name = models.CharField(max_length=255)
    company = models.ForeignKey(ClientCompanyProfile, on_delete=models.SET_NULL, null=True, blank=True)