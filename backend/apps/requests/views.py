"""API views for the inspection-request lifecycle."""

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.certificates.services import build_certificate
from apps.common.permissions import CanFillBaleForms, CanIssueCertificate
from apps.common.throttles import (
    BaleCreateRateThrottle,
    PostalCodeCheckRateThrottle,
    PublicSubmitRateThrottle,
    TrackingRateThrottle,
)
from apps.financials.models import FinancialRecord
from apps.financials.services import create_payment
from apps.inspections.services import DEFECTS_BY_KEY, evaluate_certificate_readiness

from .models import InspectionRequest
from .services import transition_to
from .serializers import (
    _APPLICANT_FIELDS,
    _SYSTEM_STATUS_FIELDS,
    BaleCreateSerializer,
    FinalPaymentSerializer,
    FixUploadSerializer,
    PublicSubmitSerializer,
    SecretaryRequestSerializer,
    StaffRequestDetailSerializer,
    StaffRequestListSerializer,
    TrackingSerializer,
)

# Fields safe to copy from a prior request when prefilling a periodic inspection
# (applicant + technical data; never files, status or the tracking code).
_PREFILL_FIELDS = (*_APPLICANT_FIELDS, *_SYSTEM_STATUS_FIELDS)

DEED_WARNING = (
    "هشدار: سند مالکیت بارگذاری نشده است. لازم است در روز بازرسی، اصل سند مالکیت را "
    "به کارشناس ارائه دهید."
)


def _request_queryset():
    """Shared queryset with N+1 protection for request detail/tracking views."""
    return (
        InspectionRequest.objects.select_related("report")
        .prefetch_related("payments", "report__photos")
    )


# --------------------------------------------------------------------------- #
# Public website                                                              #
# --------------------------------------------------------------------------- #
class PublicSubmitView(CreateAPIView):
    """Public application form handler (anonymous, throttled)."""

    serializer_class = PublicSubmitSerializer
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        # Edge case (Part 3 §1, Step 4): missing deed does NOT block submission,
        # but the client is warned to bring it on inspection day.
        warnings = [] if instance.deed_file else [DEED_WARNING]
        stage_1 = next(
            (p for p in instance.payments.all()
             if p.stage == FinancialRecord.Stage.STAGE_1),
            None,
        )
        return Response(
            {
                "id": str(instance.id),
                "tracking_code": instance.tracking_code,
                "status": instance.status,
                "stage_1_amount": str(stage_1.amount_charged) if stage_1 else None,
                "warnings": warnings,
            },
            status=status.HTTP_201_CREATED,
        )


class TrackingView(APIView):
    """Anonymous, heavily throttled tracking endpoint: ``/track/?code=ASA-XXXX``."""

    permission_classes = [AllowAny]
    throttle_classes = [TrackingRateThrottle]

    def get(self, request):
        code = request.query_params.get("code", "").strip()
        if not code:
            return Response(
                {"detail": "کد رهگیری الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance = get_object_or_404(_request_queryset(), tracking_code=code)
        serializer = TrackingSerializer(instance, context={"request": request})
        return Response(serializer.data)


class PostalCodeCheckView(APIView):
    """Non-blocking duplicate-postal-code check: ``/check-postal-code/?postal_code=``.

    Returns only a boolean so both the public form and the admin panel can warn —
    but never block — when a postal code has been used before (Part: client req #4).
    """

    permission_classes = [AllowAny]
    throttle_classes = [PostalCodeCheckRateThrottle]

    def get(self, request):
        postal_code = request.query_params.get("postal_code", "").strip()
        if not postal_code:
            return Response(
                {"detail": "کد پستی الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        exists = InspectionRequest.objects.filter(postal_code=postal_code).exists()
        return Response({"exists": exists})


class FixUploadView(APIView):
    """Client uploads proof-of-fix image for one outstanding defect."""

    permission_classes = [AllowAny]

    def post(self, request, tracking_code, defect_key):
        defect = DEFECTS_BY_KEY.get(defect_key)
        if defect is None:
            return Response(
                {"detail": "نوع نقص نامعتبر است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance = get_object_or_404(_request_queryset(), tracking_code=tracking_code)
        if instance.status != InspectionRequest.Status.UNDER_REVIEW:
            return Response(
                {"detail": "تنها در مرحله بررسی می‌توان مدارک رفع نقص را بارگذاری کرد."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report = getattr(instance, "report", None)
        if report is None or not defect.is_flagged(report):
            return Response(
                {"detail": "این نقص برای درخواست شما ثبت نشده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FixUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        setattr(report, defect.fix_image_field, serializer.validated_data["image"])
        report.save(update_fields=[defect.fix_image_field])
        return Response({"detail": "مدرک رفع نقص با موفقیت بارگذاری شد."})


class FinalPaymentView(APIView):
    """Client uploads the stage-2 settlement receipt."""

    permission_classes = [AllowAny]

    def post(self, request, tracking_code):
        instance = get_object_or_404(InspectionRequest, tracking_code=tracking_code)
        if instance.status != InspectionRequest.Status.UNDER_REVIEW:
            return Response(
                {"detail": "در حال حاضر امکان ثبت تسویه نهایی وجود ندارد."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = FinalPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_payment(
            instance,
            FinancialRecord.Stage.STAGE_2,
            serializer.validated_data["receipt_image"],
        )
        return Response({"detail": "رسید تسویه نهایی ثبت شد و در انتظار تأیید است."})


# --------------------------------------------------------------------------- #
# Bale bot                                                                    #
# --------------------------------------------------------------------------- #
class BaleCreateView(CreateAPIView):
    """Bale bot multipart intake (anonymous, throttled)."""

    serializer_class = BaleCreateSerializer
    permission_classes = [AllowAny]
    throttle_classes = [BaleCreateRateThrottle]


# --------------------------------------------------------------------------- #
# Secretary workspace                                                         #
# --------------------------------------------------------------------------- #
class SecretaryRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Bale requests awaiting transcription (split-screen UI, Part 3 §2)."""

    serializer_class = SecretaryRequestSerializer
    permission_classes = [CanFillBaleForms]
    search_fields = ("tracking_code", "company_name", "ceo_name", "ceo_phone")

    # Intake states awaiting an admin's review/approval: Bale photos to transcribe
    # and website forms pending review.
    REVIEW_STATUSES = (
        InspectionRequest.Status.BALE_PHOTO_UPLOADED,
        InspectionRequest.Status.PENDING_REVIEW,
    )

    def get_queryset(self):
        qs = InspectionRequest.objects.prefetch_related("payments")
        # The queue/source filters only shape the LIST view; retrieve/update must
        # reach any request by id (e.g. editing a scheduled request's address).
        if self.action != "list":
            return qs.order_by("-request_date")
        # ``scope=all`` drops the status filter so the admin can also review
        # already-registered requests; the default keeps the review queue (Bale
        # photos awaiting entry + website forms awaiting approval). An optional
        # ``source`` filter (bale/website) narrows by intake channel.
        if self.request.query_params.get("scope") != "all":
            qs = qs.filter(status__in=self.REVIEW_STATUSES)
        source = self.request.query_params.get("source")
        if source in (InspectionRequest.Source.BALE, InspectionRequest.Source.WEBSITE):
            qs = qs.filter(source=source)
        return qs.order_by("-request_date")

    def update(self, request, *args, **kwargs):
        # Requests stay editable through the whole lifecycle (e.g. a late address
        # change) but are frozen once the certificate has been issued.
        if self.get_object().status == InspectionRequest.Status.COMPLETED:
            return Response(
                {"detail": "درخواست تکمیل‌شده قابل ویرایش نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """'Approve & Register' — move the reviewed request to pending_payment."""
        instance = transition_to(
            self.get_object(), InspectionRequest.Status.PENDING_PAYMENT
        )
        return Response({"status": instance.status})

    @action(detail=False, methods=["get"])
    def previous(self, request):
        """Most recent prior request for a phone — prefills a periodic inspection.

        Returning applicants (``inspection_type=periodic``) already exist in our
        records; the secretary can pull their last submission's applicant/technical
        data by phone instead of re-typing it. Files and status are never returned.
        """
        phone = request.query_params.get("phone", "").strip()
        if not phone:
            return Response(
                {"detail": "شماره تماس الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        exclude_id = request.query_params.get("exclude")
        qs = InspectionRequest.objects.filter(ceo_phone=phone)
        if exclude_id:
            qs = qs.exclude(pk=exclude_id)
        previous = qs.order_by("-request_date", "-id").first()
        if previous is None:
            return Response(
                {"detail": "سابقه‌ای برای این شماره یافت نشد.", "found": False},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = SecretaryRequestSerializer(
            previous, context=self.get_serializer_context()
        ).data
        prefill = {key: data[key] for key in _PREFILL_FIELDS if key in data}
        return Response({"found": True, "data": prefill})

    @action(detail=True, methods=["get"], url_path="form-pdf")
    def form_pdf(self, request, pk=None):
        """Download the admin-transcribed form as a PDF document."""
        from .pdf import generate_bale_form_pdf

        instance = self.get_object()
        response = HttpResponse(
            generate_bale_form_pdf(instance), content_type="application/pdf"
        )
        response["Content-Disposition"] = (
            f'attachment; filename="form-{instance.tracking_code}.pdf"'
        )
        return response


# --------------------------------------------------------------------------- #
# CEO certificate control                                                     #
# --------------------------------------------------------------------------- #
class CeoCertificateViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Requests under review — defect verification + certificate issuance gate."""

    serializer_class = StaffRequestDetailSerializer
    permission_classes = [CanIssueCertificate]
    search_fields = ("tracking_code", "company_name", "ceo_name", "ceo_phone")

    def get_queryset(self):
        # ``scope=all`` shows every request (incl. already-issued ones); the
        # default keeps the under-review issuance queue.
        qs = _request_queryset()
        if self.request.query_params.get("scope") != "all":
            qs = qs.filter(status=InspectionRequest.Status.UNDER_REVIEW)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return StaffRequestListSerializer
        return StaffRequestDetailSerializer

    @action(detail=True, methods=["get"], url_path="certificate-readiness")
    def certificate_readiness(self, request, pk=None):
        """Non-mutating check used to enable/disable the issue button in the UI."""
        instance = self.get_object()
        return Response(evaluate_certificate_readiness(instance))

    @action(detail=True, methods=["post"], url_path="issue-certificate")
    def issue_certificate(self, request, pk=None):
        """Guardrail (Part 3 §4): block issuance while hard requirements are unmet.

        Hard blockers (missing report / unfixed defects) always return a descriptive
        400. An unapproved stage-2 receipt is a *soft* check: issuance is refused
        with ``requires_confirmation`` unless the client re-sends ``force=true``.
        Otherwise generates the PDF certificate, persists it to object storage, and
        routes the request to ``completed`` via the state machine (which fires the
        "certificate ready" SMS).
        """
        instance = self.get_object()
        readiness = evaluate_certificate_readiness(instance)

        if readiness["blocking_reasons"]:
            return Response(
                {"detail": "صدور گواهی‌نامه ممکن نیست.", "reasons": readiness["reasons"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        force = str(request.data.get("force", "")).lower() in ("true", "1")
        if not readiness["payment_approved"] and not force:
            return Response(
                {
                    "detail": "رسید تسویه نهایی هنوز تأیید نشده است. "
                    "آیا از صدور گواهی‌نامه مطمئن هستید؟",
                    "reasons": readiness["reasons"],
                    "requires_confirmation": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        certificate_url = build_certificate(instance, issued_by=request.user)
        instance = transition_to(instance, InspectionRequest.Status.COMPLETED)
        return Response({
            "detail": "گواهی‌نامه با موفقیت صادر شد.",
            "status": instance.status,
            "certificate_url": certificate_url,
        })
