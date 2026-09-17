
from datetime import timedelta

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from users.models import User


class Vehicle(models.Model):
    class FuelType(models.TextChoices):
        DIESEL = "diesel", "Diesel"
        PETROL = "petrol", "Petrol"
        ELECTRIC = "electric", "Electric"
        HYBRID = "hybrid", "Hybrid"
        LPG = "lpg", "LPG"
    
    carrier = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="vehicles",
        limit_choices_to={"role": User.Role.CARRIER_COMPANY},
    )
    plate_number = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    assigned_driver = models.ForeignKey(
        "users.DriverProfile", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="vehicles",
    )
    insurance_expiry = models.DateField(null=True, blank=True)
    tech_inspection_expiry = models.DateField(
        null=True, blank=True,
        help_text="Mandatory inspection HU/AU (TÜV)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    vehicle_ref = models.CharField(
        max_length=32, unique=True, null=True, blank=True,
        help_text="Внешний ID для аналитики, формат VH-####",
    )
    vehicle_type = models.CharField(max_length=32, blank=True)
    gross_vehicle_weight_kg = models.IntegerField(validators=[MinValueValidator(1)])
    payload_capacity_kg = models.IntegerField(validators=[MinValueValidator(1)])
    pallet_capacity = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    fuel_type = models.CharField(max_length=20, choices=FuelType.choices, default=FuelType.DIESEL)
    euro_emission_class = models.CharField(
        max_length=10, default="Euro_6", help_text="Для German LKW-Maut",
    )
    is_active = models.BooleanField(default=True)
    is_test = models.BooleanField(default=False)

    REMINDER_WINDOW_DAYS = 30
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(gross_vehicle_weight_kg__gt=0),
                name="chk_vehicle_gvw_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(payload_capacity_kg__gt=0),
                name="chk_vehicle_payload_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(pallet_capacity__gte=0),
                name="chk_vehicle_pallet_non_negative",
            ),
        ]
    
    @property
    def insurance_expiring_soon(self) -> bool:
        if not self.insurance_expiry:
            return False
        return self.insurance_expiry <= timezone.now().date() + timedelta(days=self.REMINDER_WINDOW_DAYS)

    @property
    def tech_inspection_expiring_soon(self) -> bool:
        if not self.tech_inspection_expiry:
            return False
        return self.tech_inspection_expiry <= timezone.now().date() + timedelta(days=self.REMINDER_WINDOW_DAYS)

    def __str__(self):
        return self.plate_number