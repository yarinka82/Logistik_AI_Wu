from django.db import transaction
from rest_framework import serializers
from users.models import DriverProfile, User, CarrierCompanyProfile
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
            "is_confirmed_by_employer",
            "confirmed_at",
            "driving_license_expiry_date", "license_expiring_soon",
        ]
        read_only_fields = fields

   
    
    
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



class StaffDriverDetailSerializer(serializers.ModelSerializer):
    """GET (detail) + PATCH для одного водія з панелі компанії."""
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    is_active = serializers.BooleanField(source="user.is_active", read_only=True)
    license_expiring_soon = serializers.BooleanField(read_only=True)
    code_95_expiring_soon = serializers.BooleanField(read_only=True)
    adr_expiring_soon = serializers.BooleanField(read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # default_vehicle можна вибирати тільки з транспорту тієї ж компанії
        request = self.context.get("request")
        if request is not None:
            carrier = getattr(request.user, "carrier_company_profile", None)
            self.fields["default_vehicle"].queryset = (
                Vehicle.objects.filter(carrier=request.user) if carrier
                else Vehicle.objects.none()
            )
    
    def validate(self, attrs):
        categories = attrs.get("code_95_categories", getattr(self.instance, "code_95_categories", None))
        expiry = attrs.get("code_95_expiry_date", getattr(self.instance, "code_95_expiry_date", None))
        has_categories = bool(categories) if not isinstance(categories, str) else bool(categories.strip())

        if has_categories and not expiry:
            raise serializers.ValidationError(
                {"code_95_expiry_date": "Вкажіть дату дії коду 95."}
            )
        if expiry and not has_categories:
            raise serializers.ValidationError(
                {"code_95_categories": "Вкажіть категорії коду 95."}
            )
        return attrs
    
    class Meta:
        model = DriverProfile
        fields = [
            "id",
            # редагується компанією
            "full_name",
            "driver_license_number",
            "base_city",
            "driving_license_categories",
            "driving_license_expiry_date",
            "code_95_categories",
            "code_95_expiry_date",
            "has_adr",
            "adr_expiry_date",
            "default_vehicle",
            # тільки читання
            "license_photo",
            "email",
            "phone",
            "is_active",
            "status",
            "is_confirmed_by_employer",
            "confirmed_at",
            "license_expiring_soon",
            "code_95_expiring_soon",
            "adr_expiring_soon",
        ]
        read_only_fields = [
            "id", "license_photo", "email", "phone", "is_active", "status",
            "is_confirmed_by_employer", "confirmed_at",
            "license_expiring_soon", "code_95_expiring_soon", "adr_expiring_soon",
        ]




class VehicleSerializer(serializers.ModelSerializer):
    insurance_expiring_soon = serializers.BooleanField(read_only=True)
    tech_inspection_expiring_soon = serializers.BooleanField(read_only=True)
    assigned_driver_name = serializers.CharField(
        source="assigned_driver.full_name", read_only=True, default=None
    )

    class Meta:
        model = Vehicle
        fields = [
            "id", "plate_number", "brand", "model",
            "vehicle_type",
            "gross_vehicle_weight_kg",
            "payload_capacity_kg",
            "pallet_capacity",
            "fuel_type",
            "euro_emission_class",
            "assigned_driver", "assigned_driver_name",
            "insurance_expiry", "tech_inspection_expiry",
            "insurance_expiring_soon", "tech_inspection_expiring_soon",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        
   
        
class CarrierCompanyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarrierCompanyProfile
        fields = ["id", "company_name", "base_city"]
        
        

class CarrierCompanyRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    company_name = serializers.CharField(max_length=255)
    company_registration_number = serializers.CharField(max_length=50)
    also_drives = serializers.BooleanField(default=False)
    driver_license_number = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["also_drives"] and not attrs.get("driver_license_number"):
            raise serializers.ValidationError(
                {"driver_license_number": "Обов'язково, якщо ви також керуєте особисто"}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=User.Role.CARRIER_COMPANY,
        )
        CarrierCompanyProfile.objects.create(
            user=user,
            company_name=validated_data["company_name"],
            company_registration_number=validated_data["company_registration_number"],
        )
        if validated_data["also_drives"]:
            DriverProfile.objects.create(
                user=user,
                full_name=validated_data["company_name"],
                driver_license_number=validated_data.get("driver_license_number", ""),
            )
        return user



class EmployerShortSerializer(serializers.ModelSerializer):
    """Краткая информация о компании-работодателе."""

    class Meta:
        model = CarrierCompanyProfile
        fields = ["id", "company_name", "company_registration_number"]



class DriverProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    employer = EmployerShortSerializer(
        read_only=True
    )

    class Meta:
        model = DriverProfile
        fields = [
            "id",
            "full_name",
            "driver_license_number",
            "license_photo",
            # Связь с компанией (может быть null)
            "employer",
            "is_confirmed_by_employer",
            "confirmed_at",
            # Личные параметры водителя
            "driver_type",
            "status",
            "base_city",
            "driving_license_categories",
            "driving_license_expiry_date",
            "code_95_categories",
            "code_95_expiry_date",
            "has_adr",
            "adr_expiry_date",
            "default_vehicle",
            "email",
            "phone",
        ]
        read_only_fields = [
            "id",
            "driver_type",
            "status",
            "email",
            "phone",
            "employer",
            "is_confirmed_by_employer",
            "confirmed_at",
        ]

