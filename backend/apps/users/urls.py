from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MeView, UserManagementViewSet

app_name = "users"

router = DefaultRouter()
router.register("users", UserManagementViewSet, basename="users")

urlpatterns = [
    # Must precede the router so "me" is not captured as a user pk.
    path("users/me/", MeView.as_view(), name="me"),
] + router.urls
