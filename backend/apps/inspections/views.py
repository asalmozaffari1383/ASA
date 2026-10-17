"""Inspection API: expert report submission + CEO defect verification."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
)
from rest_framework.response import Response

from apps.common.permissions import CanDoInspection, CanIssueCertificate
from apps.common.validators import validate_image
from apps.requests.models import InspectionRequest
from apps.requests.serializers import (
    StaffRequestDetailSerializer,
    StaffRequestListSerializer,
)
from apps.requests.services import transition_to

from .models import InspectionPhoto, InspectionReport
from .serializers import DefectVerificationSerializer, InspectionReportSerializer


class ExpertScheduledRequestsView(ListAPIView):
    """Expert worklist: requests in ``scheduled`` status (Part 3 §3)."""

    serializer_class = StaffRequestListSerializer
    permission_classes = [CanDoInspection]
    search_fields = ("tracking_code", "company_name", "ceo_name", "ceo_phone")

    def get_queryset(self):
        # ``scope=all`` shows every request (incl. inspected/completed ones); the
        # default keeps the expert worklist (requests awaiting inspection).
        qs = InspectionRequest.objects.all()
        if self.request.query_params.get("scope") != "all":
            qs = qs.filter(status=InspectionRequest.Status.SCHEDULED)
        return qs.order_by("request_date")


class ExpertRequestDetailView(RetrieveAPIView):
    """Read-only full view of a request (incl. the submitted report) for experts.

    Lets an expert re-open cases they have already inspected and review the complete
    details at any time — the worklist itself only holds ``scheduled`` requests.
    """

    serializer_class = StaffRequestDetailSerializer
    permission_classes = [CanDoInspection]
    lookup_field = "id"

    def get_queryset(self):
        return InspectionRequest.objects.select_related("report").prefetch_related(
            "payments", "report__photos"
        )


class ReportSubmissionView(CreateAPIView):
    """Expert submits an inspection report.

    On success: persists the report, attaches the uploaded environmental photos,
    and routes the ``scheduled -> under_review`` move through the centralized state
    machine, which fires the client SMS after commit — all atomically.
    """

    serializer_class = InspectionReportSerializer
    permission_classes = [CanDoInspection]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        photos = request.FILES.getlist("uploaded_photos")
        for photo in photos:
            validate_image(photo)  # enforce MIME/size before persisting

        with transaction.atomic():
            report = serializer.save(expert=request.user)
            InspectionPhoto.objects.bulk_create(
                [InspectionPhoto(report=report, photo=photo) for photo in photos]
            )
            # State machine handles the lock, validation and the post-commit SMS.
            transition_to(report.request, InspectionRequest.Status.UNDER_REVIEW)

        return Response(
            self.get_serializer(report).data, status=status.HTTP_201_CREATED
        )


class DefectVerificationView(RetrieveUpdateAPIView):
    """CEO toggles the ``is_*_fixed`` flags for a request's report (Part 3 §4)."""

    serializer_class = DefectVerificationSerializer
    permission_classes = [CanIssueCertificate]
    http_method_names = ["get", "patch", "put"]

    def get_object(self):
        return get_object_or_404(
            InspectionReport.objects.select_related("request"),
            request_id=self.kwargs["request_id"],
        )
