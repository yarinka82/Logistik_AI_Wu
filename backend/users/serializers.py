
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, ClientCompanyProfile, ClientIndividualProfile, DriverProfile, AccountantProfile


class RegisterSerializer(serializers.ModelSerializer):
    PUBLIC_ROLES = {
        User.Role.CLIENT_COMPANY,
        User.Role.CLIENT_INDIVIDUAL,
        User.Role.DRIVER,
    }

    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=True)
    company_name = serializers.CharField(required=False, write_only=True)
    edrpou = serializers.CharField(required=False, write_only=True)
    full_name = serializers.CharField(required=False, write_only=True)
    driver_license_number = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = User
        fields = ["email", "username", "phone", "password", "role",
                  "company_name", "edrpou", "full_name", "driver_license_number"]
    
    def validate(self, attrs):
        role = attrs.get("role")
        
        if role not in self.PUBLIC_ROLES:
            raise serializers.ValidationError(
                {"role": "Diese Rolle kann nicht über die öffentliche Registrierung angelegt werden."},
                code="role_not_public",
            )
        if role == User.Role.CLIENT_COMPANY and not attrs.get("company_name"):
            raise serializers.ValidationError(
                {"company_name": "Firmenname ist für die Rolle „client_company“ erforderlich."},
                code="company_name_required",
            )
        if role == User.Role.DRIVER and not attrs.get("driver_license_number"):
            raise serializers.ValidationError(
                {"driver_license_number": "Führerscheinnummer ist für die Rolle „driver“ erforderlich."},
                code="license_required",
            )
        
        temp_user = User(
            email=attrs.get("email"),
            username=attrs.get("username"),
            phone=attrs.get("phone"),
        )
        try:
            validate_password(attrs.get("password"), user=temp_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        
        return attrs

    def create(self, validated_data):
        role = validated_data["role"]
        profile_fields = {
            k: validated_data.pop(k) for k in
            ["company_name", "edrpou", "full_name", "driver_license_number"]
            if k in validated_data
        }
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if role == User.Role.CLIENT_COMPANY:
            ClientCompanyProfile.objects.create(
                user=user,
                company_name=profile_fields.get("company_name", ""),
                edrpou=profile_fields.get("edrpou", ""),
            )
        elif role == User.Role.CLIENT_INDIVIDUAL:
            ClientIndividualProfile.objects.create(user=user, full_name=profile_fields.get("full_name", ""))
        elif role == User.Role.DRIVER:
            DriverProfile.objects.create(
                user=user,
                full_name=profile_fields.get("full_name", ""),
                driver_license_number=profile_fields.get("driver_license_number", ""),
            )
        elif role == User.Role.ACCOUNTANT:
            AccountantProfile.objects.create(user=user, full_name=profile_fields.get("full_name", ""))
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "phone", "role", "is_verified"]