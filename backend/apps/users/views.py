"""User API: current-user profile + CEO-only staff management."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsCEO

from .models import User
from .serializers import (
    CurrentUserSerializer,
    SelfProfileSerializer,
    UserManagementSerializer,
)


class MeView(APIView):
    """Current-user profile: read (GET) + self-service update (PATCH)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)

    def patch(self, request):
        """Let a user update their own name / upload their signature image."""
        serializer = SelfProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Return the full current-user payload so the client can refresh state.
        return Response(CurrentUserSerializer(request.user).data)


class UserManagementViewSet(viewsets.ModelViewSet):
    """CEO staff management: roles + dynamic permission toggles (Part 3 §4)."""

    queryset = User.objects.all().order_by("username")
    serializer_class = UserManagementSerializer
    permission_classes = [IsCEO]
