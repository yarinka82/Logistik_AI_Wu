from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, permissions, exceptions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import RegisterSerializer, UserSerializer

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