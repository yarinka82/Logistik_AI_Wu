import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone

from users.models import User


def generate_invite_code() -> str:
    return secrets.token_urlsafe(8)[:10].upper()


class DriverInvite(models.Model):
    company = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="driver_invites",
        limit_choices_to={"role": User.Role.DRIVER},
    )
    code = models.CharField(max_length=12, unique=True, default=generate_invite_code)
    used_by = models.OneToOneField(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="used_invite"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self) -> bool:
        return self.used_by_id is None and self.expires_at > timezone.now()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code


class Vehicle(models.Model):
    carrier = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="vehicles",
        limit_choices_to={"role": User.Role.DRIVER},
    )
    plate_number = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    assigned_driver = models.ForeignKey(
        "users.DriverProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="vehicles"
    )
    insurance_expiry = models.DateField(null=True, blank=True)
    tech_inspection_expiry = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    REMINDER_WINDOW_DAYS = 30

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