from django.urls import path

from .views import (
    DefectVerificationView,
    ExpertRequestDetailView,
    ExpertScheduledRequestsView,
    ReportSubmissionView,
)

app_name = "inspections"

urlpatterns = [
    path(
        "inspections/scheduled-requests/",
        ExpertScheduledRequestsView.as_view(),
        name="scheduled-requests",
    ),
    path(
        "inspections/requests/<uuid:id>/",
        ExpertRequestDetailView.as_view(),
        name="request-detail",
    ),
    path("inspections/reports/", ReportSubmissionView.as_view(), name="report-submit"),
    path(
        "inspections/reports/<uuid:request_id>/defects/",
        DefectVerificationView.as_view(),
        name="defects",
    ),
]
