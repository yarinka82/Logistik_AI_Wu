
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import (
    AccountantProfile,
    ClientCompanyProfile,
    ClientIndividualProfile,
    DriverProfile,
    User,
)


class LoginSerializer(serializers.Serializer):
    # Accepts email, username or email_or_username for frontend compatibility
    email_or_username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        login_val = (
            attrs.get("email_or_username")
            or attrs.get("email")
            or attrs.get("username")
        )
        if not login_val:
            raise serializers.ValidationError(
                {"email_or_username": _("Bitte geben Sie Ihre E-Mail-Adresse oder Ihren Benutzernamen ein.")}
            )
        attrs["login_val"] = login_val.strip()
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    PUBLIC_ROLES = {
        User.Role.CLIENT_COMPANY,
        User.Role.CLIENT_INDIVIDUAL,
        User.Role.DRIVER,
    }

    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    username = serializers.CharField(required=True)

    # Additional profile fields
    company_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    edrpou = serializers.CharField(required=False, allow_blank=True, write_only=True)
    full_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    driver_license_number = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "phone",
            "password",
            "role",
            "company_name",
            "edrpou",
            "full_name",
            "driver_license_number",
        ]

    def validate_email(self, value):
        # We bring the email to lowercase and check the uniqueness
        norm_email = value.lower().strip()
        if User.objects.filter(email__iexact=norm_email).exists():
            raise serializers.ValidationError(_("Ein Benutzer mit dieser E-Mail existiert bereits."))
        return norm_email

    def validate_username(self, value):
        norm_username = value.strip()
        if User.objects.filter(username__iexact=norm_username).exists():
            raise serializers.ValidationError(_("Dieser Benutzername ist bereits vergeben."))
        return norm_username

    def validate(self, attrs):
        role = attrs.get("role")

        # 1. Verification of public roles
        if role not in self.PUBLIC_ROLES:
            raise serializers.ValidationError(
                {"role": _("Diese Rolle kann nicht über die öffentliche Registrierung angelegt werden.")},
                code="role_not_public",
            )

        # 2. Checking the fields of specific roles
        if role == User.Role.CLIENT_COMPANY and not attrs.get("company_name"):
            raise serializers.ValidationError(
                {"company_name": _("Firmenname ist für die Rolle „client_company“ erforderlich.")},
                code="company_name_required",
            )

        if role == User.Role.CLIENT_INDIVIDUAL and not attrs.get("full_name"):
            raise serializers.ValidationError(
                {"full_name": _("Vollständiger Name ist für Privatkunden erforderlich.")},
                code="full_name_required",
            )

        if role == User.Role.DRIVER:
            if not attrs.get("full_name"):
                raise serializers.ValidationError(
                    {"full_name": _("Vollständiger Name ist für Fahrer erforderlich.")},
                    code="full_name_required",
                )
            if not attrs.get("driver_license_number"):
                raise serializers.ValidationError(
                    {"driver_license_number": _("Führerscheinnummer ist für Fahrer erforderlich.")},
                    code="license_required",
                )

        # 3. Validating password strength
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
            k: validated_data.pop(k)
            for k in ["company_name", "edrpou", "full_name", "driver_license_number"]
            if k in validated_data
        }
        password = validated_data.pop("password")

        # Atomic user and profile creation in one transaction
        with transaction.atomic():
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
                ClientIndividualProfile.objects.create(
                    user=user,
                    full_name=profile_fields.get("full_name", ""),
                )
            elif role == User.Role.DRIVER:
                DriverProfile.objects.create(
                    user=user,
                    full_name=profile_fields.get("full_name", ""),
                    driver_license_number=profile_fields.get("driver_license_number", ""),
                )
            elif role == User.Role.ACCOUNTANT:
                AccountantProfile.objects.create(
                    user=user,
                    full_name=profile_fields.get("full_name", ""),
                )

        return user


class UserSerializer(serializers.ModelSerializer):
    profile_data = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "username", "phone", "role", "is_verified", "profile_data"]
        read_only_fields = ["id", "email", "username", "role", "is_verified"]

    def get_profile_data(self, obj):
        if obj.role == User.Role.CLIENT_COMPANY and hasattr(obj, "company_profile"):
            return {
                "company_name": obj.company_profile.company_name,
                "edrpou": obj.company_profile.edrpou,
            }
        elif obj.role == User.Role.CLIENT_INDIVIDUAL and hasattr(obj, "individual_profile"):
            return {
                "full_name": obj.individual_profile.full_name,
            }
        elif obj.role == User.Role.DRIVER and hasattr(obj, "driver_profile"):
            return {
                "full_name": obj.driver_profile.full_name,
                "driver_license_number": obj.driver_profile.driver_license_number,
            }
        return {}
    
    
    
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError(_("Das alte Passwort ist nicht korrekt."))
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value
    
    
    
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()



class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        uid = attrs.get("uid")
        token = attrs.get("token")
        new_password = attrs.get("new_password")

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError(
                {"token": _("Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.")}
            )

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError(
                {"token": _("Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.")}
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})

        attrs["user"] = user
        return attrs