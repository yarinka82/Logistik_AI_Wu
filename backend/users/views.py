import os

# ───────────────────────────────────────────────────────────────────────────────
# Django: Core & Auth
# ───────────────────────────────────────────────────────────────────────────────
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

# ───────────────────────────────────────────────────────────────────────────────
# DRF: Core
# ───────────────────────────────────────────────────────────────────────────────
from rest_framework import generics, permissions, exceptions, status, parsers, views, response, filters
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# ───────────────────────────────────────────────────────────────────────────────
# DRF: JWT
# ───────────────────────────────────────────────────────────────────────────────
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .permissions import IsAdmin
# ───────────────────────────────────────────────────────────────────────────────
# Local Serializers
# ───────────────────────────────────────────────────────────────────────────────
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer, UserAdminListSerializer,
)
from .utils import validate_license_photo, compress_license_photo

# ───────────────────────────────────────────────────────────────────────────────
# Settings / Environment
# ───────────────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        login_value = attrs.get(self.username_field)  # comes under the key "email", but may also be a username

        try:
            user = User.objects.get(
                Q(**{f"{User.USERNAME_FIELD}__iexact": login_value}) | Q(username__iexact=login_value)
            )
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )
        except User.MultipleObjectsReturned:
            # in case email and username happen to match for different users

            raise exceptions.AuthenticationFailed(
                "No active account found with the given credentials",
                "no_active_account",
            )

        # substitute with the actual USERNAME_FIELD value so the parent validate() can authenticate

        attrs[self.username_field] = getattr(user, User.USERNAME_FIELD)
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["is_verified"] = user.is_verified
        return token


class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
    
 
    
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"detail": "Passwort erfolgreich geändert."}, status=status.HTTP_200_OK)



class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{FRONTEND_URL}/reset-password/{uid}/{token}/"
            
            subject = "Passwort zurücksetzen | Fracht.Markt"
            
            # Text version
            plain_message = (
                f"Hallo {user.username},\n\n"
                f"Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:\n"
                f"{reset_url}\n\n"
                f"Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail."
            )
            
            # 2. Beautiful HTML version with button
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f6f8; margin: 0; padding: 30px; }}
                .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 36px; border: 1px solid #e1e4e8; }}
                .brand {{ font-size: 24px; font-weight: 800; color: #0d1117; margin-bottom: 20px; }}
                .brand span {{ color: #00d2b4; }}
                h2 {{ font-size: 20px; color: #1f2328; margin-top: 0; }}
                p {{ font-size: 15px; color: #57606a; line-height: 1.6; }}
                .btn {{ display: inline-block; background-color: #00d2b4; color: #0d1117 !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 20px 0; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #8c959f; border-top: 1px solid #e1e4e8; padding-top: 16px; }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="brand">Fracht<span>.</span>Markt</div>
                <h2>Passwort zurücksetzen</h2>
                <p>Hallo <strong>{user.username}</strong>,</p>
                <p>Sie haben das Zurücksetzen Ihres Passworts angefordert. Klicken Sie auf den Button unten, um ein neues Passwort zu vergeben:</p>
                <div style="text-align: center;">
                  <a href="{reset_url}" class="btn" target="_blank">Neues Passwort festlegen</a>
                </div>
                <p>Oder kopieren Sie diesen Link in Ihren Browser:<br><a href="{reset_url}" style="color: #0969da; word-break: break-all;">{reset_url}</a></p>
                <div class="footer">
                  Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail einfach ignorieren.
                </div>
              </div>
            </body>
            </html>
            """
            
            send_mail(
                subject=subject,
                message=plain_message,
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        
        return Response(
            {"detail": "Wenn diese E-Mail registriert ist, wurde ein Link gesendet."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data["user"]
        new_password = serializer.validated_data["new_password"]
        
        user.set_password(new_password)
        user.save()
        
        return Response(
            {"detail": "Passwort wurde erfolgreich geändert."},
            status=status.HTTP_200_OK,
        )
    
    
class LicensePhotoUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser]

    def post(self, request):
        profile = getattr(request.user, "driver_profile", None)
        if not profile:
            return response.Response({"detail": "Тільки для водіїв"}, status=403)

        file = request.FILES.get("license_photo")
        if not file:
            return response.Response({"detail": "Файл не надано"}, status=400)

        try:
            validate_license_photo(file)
            processed = compress_license_photo(file)
        except ValidationError as e:
            detail = e.message_dict if hasattr(e, "message_dict") else e.messages[0]
            return response.Response(detail, status=400)

        profile.license_photo = processed
        profile.save(update_fields=["license_photo"])
        return response.Response({"license_photo": profile.license_photo.url})



class UserAdminListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = UserAdminListSerializer
    queryset = User.objects.all().order_by("-date_joined")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["role", "is_blocked"]     # ?role=driver&is_blocked=true
    search_fields = ["email", "username", "phone", "first_name", "last_name"]



class UserBlockView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)

        if user.pk == request.user.pk:
            raise PermissionDenied("Не можна заблокувати власний акаунт.")

        if user.role == User.Role.ADMIN:
            raise PermissionDenied("Блокування адміністраторів заборонено.")

        user.is_blocked = True
        user.blocked_at = timezone.now()
        user.save(update_fields=["is_blocked", "blocked_at"])
        return Response(UserAdminListSerializer(user).data)



class UserUnblockView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        user.is_blocked = False
        user.blocked_at = None
        user.save(update_fields=["is_blocked", "blocked_at"])
        return Response(UserAdminListSerializer(user).data)
    
    
    