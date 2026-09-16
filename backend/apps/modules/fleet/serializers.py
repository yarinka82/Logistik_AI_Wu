
from rest_framework import serializers
from users.models import DriverProfile, User
from .models import  Vehicle


class DriverProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)

    class Meta:
        model = DriverProfile
        fields = [
            "id", "full_name", "driver_license_number", "license_photo",
            "is_carrier_company", "also_drives", "company_name", "company_registration_number",
            "driver_type", "status", "base_city",
            "driving_license_categories", "driving_license_expiry_date",
            "code_95_categories", "code_95_expiry_date",
            "has_adr", "adr_expiry_date",
            "default_vehicle", "email", "phone",
        ]
        read_only_fields = [
            "id", "driver_type", "status", "email", "phone",
            # employer/is_confirmed_by_employer/confirmed_at сюда намеренно не включены —
            # ими управляют только request_join/approve/dismiss, не прямой PATCH
        ]
        
        
        
class StaffDriverListSerializer(serializers.ModelSerializer):
    """Только чтение — для GET /fleet/staff-drivers/."""
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    status = serializers.ChoiceField(choices=DriverProfile.DriverStatus.choices, read_only=True)
    driving_license_expiry_date = serializers.DateField(read_only=True)
    license_expiring_soon = serializers.BooleanField(read_only=True)

    class Meta:
        model = DriverProfile
        fields = [
            "id", "full_name", "driver_license_number", "license_photo",
            "email", "phone", "is_active", "status",
            "driving_license_expiry_date", "license_expiring_soon",
        ]
        read_only_fields = fields



class StaffDriverCreateSerializer(serializers.Serializer):
    """POST — создание штатного водителя владельцем (invite-flow)."""
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(max_length=255)
    driver_license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    license_photo = serializers.FileField(required=False)

    def create(self, validated_data):
        request = self.context["request"]
        owner_profile = request.user.driver_profile

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            phone=validated_data["phone"],
            role=User.Role.DRIVER,
            is_active=False,
        )
        user.set_unusable_password()
        user.save()

        profile = DriverProfile.objects.create(
            user=user,
            full_name=validated_data["full_name"],
            driver_license_number=validated_data.get("driver_license_number", ""),
            license_photo=validated_data.get("license_photo"),
            employer=owner_profile,
        )
        # тут же — отправка инвайт-токена на email/телефон
        return profile
    
    
    
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
        
        
        
class CarrierCompanyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverProfile
        fields = ["id", "company_name", "base_city"]
        


