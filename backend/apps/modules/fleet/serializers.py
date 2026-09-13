
from rest_framework import serializers
from users.models import DriverProfile
from .models import DriverInvite, Vehicle


class StaffDriverSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)

    class Meta:
        model = DriverProfile
        fields = ["id", "full_name", "driver_license_number", "license_photo", "email", "is_active"]


class StaffDriverUpdateSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="user.is_active")

    class Meta:
        model = DriverProfile
        fields = ["is_active"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "is_active" in user_data:
            instance.user.is_active = user_data["is_active"]
            instance.user.save(update_fields=["is_active"])
        return instance



class DriverInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverInvite
        fields = ["id", "code", "created_at", "expires_at", "used_by"]
        read_only_fields = fields


class VehicleSerializer(serializers.ModelSerializer):
    insurance_expiring_soon = serializers.BooleanField(read_only=True)
    tech_inspection_expiring_soon = serializers.BooleanField(read_only=True)
    assigned_driver_name = serializers.CharField(source="assigned_driver.full_name", read_only=True, default=None)

    class Meta:
        model = Vehicle
        fields = [
            "id", "plate_number", "brand", "model",
            "assigned_driver", "assigned_driver_name",
            "insurance_expiry", "tech_inspection_expiry",
            "insurance_expiring_soon", "tech_inspection_expiring_soon",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]