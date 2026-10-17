from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    FinancialRecordViewSet,
    PublicConfigView,
    ScheduleWithoutAdvanceView,
    SystemConfigurationView,
)

app_name = "financials"

router = DefaultRouter()
router.register("financials/payments", FinancialRecordViewSet, basename="payments")

urlpatterns = [
    path("public/config/", PublicConfigView.as_view(), name="public-config"),
    path("financials/settings/", SystemConfigurationView.as_view(), name="settings"),
    path(
        "financials/requests/<uuid:pk>/schedule-without-advance/",
        ScheduleWithoutAdvanceView.as_view(),
        name="schedule-without-advance",
    ),
] + router.urls
