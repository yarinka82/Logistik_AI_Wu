
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import (
    ClientCompanyProfile,
    ClientIndividualProfile,
    DriverProfile,
    User,
)
from .utils import validate_license_photo, compress_license_photo



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
        User.Role.CARRIER_COMPANY,
    }

    password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )
    company_name = serializers.CharField(required=False, write_only=True)
    company_registration_number = serializers.CharField(
        required=False, write_only=True
    )
    full_name = serializers.CharField(required=False, write_only=True)
    driver_license_number = serializers.CharField(
        required=False, write_only=True
    )
    license_photo = serializers.FileField(required=False, write_only=True)
    also_drives = serializers.BooleanField(
        required=False, write_only=True, default=False
    )

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "phone",
            "password",
            "role",
            "license_photo",
            "company_name",
            "company_registration_number",
            "full_name",
            "driver_license_number",
            "also_drives",
        ]

    def validate_license_photo(self, file):
        validate_license_photo(file)
        return file

    def validate(self, attrs):
        role = attrs.get("role")
        if role not in self.PUBLIC_ROLES:
            raise serializers.ValidationError({
                "role": (
                    "Diese Rolle kann nicht über die öffentliche Registrierung"
                    " angelegt werden."
                )
            })

        if role == User.Role.CLIENT_COMPANY and not attrs.get("company_name"):
            raise serializers.ValidationError({
                "company_name": (
                    "company_name обов'язковий для ролі client_company"
                )
            })

        if role == User.Role.CARRIER_COMPANY:
            if not attrs.get("company_name"):
                raise serializers.ValidationError({
                    "company_name": (
                        "company_name обов'язковий для перевізника-компанії"
                    )
                })
            if not attrs.get("company_registration_number"):
                raise serializers.ValidationError({
                    "company_registration_number": (
                        "Реєстраційний номер компанії обов'язковий для"
                        " перевізника-компанії"
                    )
                })
            if attrs.get("also_drives") and not attrs.get(
                "driver_license_number"
            ):
                raise serializers.ValidationError({
                    "driver_license_number": (
                        "Обов'язково, якщо перевізник також керує особисто"
                    )
                })

        if role == User.Role.DRIVER and not attrs.get("driver_license_number"):
            raise serializers.ValidationError({
                "driver_license_number": (
                    "driver_license_number обов'язковий для ролі driver"
                )
            })

        return attrs

    def create(self, validated_data):
        role = validated_data["role"]
        profile_fields = {
            k: validated_data.pop(k)
            for k in [
                "company_name",
                "company_registration_number",
                "full_name",
                "driver_license_number",
            ]
            if k in validated_data
        }
        also_drives = validated_data.pop("also_drives", False)
        license_photo = validated_data.pop("license_photo", None)
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if role == User.Role.CLIENT_COMPANY:
            ClientCompanyProfile.objects.create(
                user=user,
                company_name=profile_fields.get("company_name", ""),
                registration_number=profile_fields.get(
                    "company_registration_number", ""
                ),
            )
        elif role == User.Role.CLIENT_INDIVIDUAL:
            ClientIndividualProfile.objects.create(
                user=user, full_name=profile_fields.get("full_name", "")
            )
        elif role in (User.Role.DRIVER, User.Role.CARRIER_COMPANY):
            is_carrier_company = role == User.Role.CARRIER_COMPANY
            driver_profile = DriverProfile.objects.create(
                user=user,
                full_name=profile_fields.get("full_name", ""),
                driver_license_number=profile_fields.get(
                    "driver_license_number", ""
                ),
                company_name=profile_fields.get("company_name", ""),
                company_registration_number=profile_fields.get(
                    "company_registration_number", ""
                ),
                is_carrier_company=is_carrier_company,
                also_drives=also_drives if is_carrier_company else True,
            )
            if license_photo:
                driver_profile.license_photo = compress_license_photo(
                    license_photo
                )
                driver_profile.save(update_fields=["license_photo"])

        return user



class UserSerializer(serializers.ModelSerializer):
    profile_data = serializers.SerializerMethodField()
    license_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "username", "phone", "role", "is_verified", "profile_data", "license_photo"]
        read_only_fields = ["id", "email", "username", "role", "is_verified"]

    def get_license_photo(self, user):
        profile = getattr(user, "driver_profile", None)
        if profile and profile.license_photo:
            request = self.context.get("request")
            url = profile.license_photo.url
            return request.build_absolute_uri(url) if request else url
        return None
    
    def get_profile_data(self, obj):
        if obj.role == User.Role.CLIENT_COMPANY and hasattr(obj, "company_profile"):
            return {
                "company_name": obj.company_profile.company_name,
                "company_registration_number": obj.company_profile.company_registration_number,
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