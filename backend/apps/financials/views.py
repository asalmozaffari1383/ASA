"""Financial API: payment approval dashboard + system configuration."""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.debug import sensitive_post_parameters
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import CanManageFinancial, IsCEO
from apps.requests.models import InspectionRequest
from apps.requests.services import transition_to

from .models import ConfigurationChange, FinancialRecord, SystemConfiguration
from .serializers import BotSettingsSerializer, FinancialRecordSerializer, PAYMENT_FIELDS, SystemConfigurationSerializer
from .security import verify_current_password


class PublicConfigView(APIView):
    """Anonymous read-only config the public wizard needs (stage amounts)."""

    permission_classes = [AllowAny]

    def get(self, request):
        config = SystemConfiguration.load()
        return Response({
            "stage_1_amount": str(config.stage_1_amount),
            "stage_2_amount": str(config.stage_2_amount),
            "ceo_card_number": config.ceo_card_number,
            "ceo_account_number": config.ceo_account_number,
            "ceo_iban": config.ceo_iban,
            "ceo_account_holder": config.ceo_account_holder,
            "updated_at": config.updated_at.isoformat(),
            "allow_inspection_without_advance": (
                config.allow_inspection_without_advance
            ),
        }, headers={"Cache-Control": "no-store"})


class FinancialRecordViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """CEO financial dashboard: review and approve/reject receipts (Part 3 §4)."""

    serializer_class = FinancialRecordSerializer
    permission_classes = [CanManageFinancial]
    search_fields = (
        "request__tracking_code",
        "request__company_name",
        "request__ceo_name",
    )

    def get_queryset(self):
        # select_related avoids an N+1 when rendering tracking_code/company_name.
        qs = FinancialRecord.objects.select_related("request", "approved_by")
        stage = self.request.query_params.get("stage")
        if stage:
            qs = qs.filter(stage=stage)
        is_approved = self.request.query_params.get("is_approved")
        if is_approved is not None:
            qs = qs.filter(is_approved=is_approved.lower() in ("true", "1"))
        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        record = self.get_object()
        record.is_approved = True
        record.approved_by = request.user
        record.save(update_fields=["is_approved", "approved_by"])
        # Approving the down payment automatically advances the request to
        # scheduling (pending_payment -> scheduled) via the state machine.
        if (
            record.stage == FinancialRecord.Stage.STAGE_1
            and record.request.status == InspectionRequest.Status.PENDING_PAYMENT
        ):
            transition_to(record.request, InspectionRequest.Status.SCHEDULED)
        return Response(self.get_serializer(record).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        record = self.get_object()
        record.is_approved = False
        record.approved_by = request.user
        record.save(update_fields=["is_approved", "approved_by"])
        return Response(self.get_serializer(record).data)


class ScheduleWithoutAdvanceView(APIView):
    """Schedule a request without waiting for the advance payment (client req #6).

    Only permitted when the CEO has enabled ``allow_inspection_without_advance``.
    Moves a ``pending_payment`` request straight to ``scheduled`` without a
    stage-1 approval, so inspections are no longer strictly gated on the down
    payment. Who has paid is still tracked on the financial dashboard.
    """

    permission_classes = [CanManageFinancial]

    def post(self, request, pk=None):
        if not SystemConfiguration.load().allow_inspection_without_advance:
            return Response(
                {"detail": "امکان بازرسی بدون پیش‌پرداخت در تنظیمات فعال نیست."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance = get_object_or_404(InspectionRequest, pk=pk)
        if instance.status != InspectionRequest.Status.PENDING_PAYMENT:
            return Response(
                {"detail": "تنها درخواست‌های در انتظار پرداخت را می‌توان زمان‌بندی کرد."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance = transition_to(instance, InspectionRequest.Status.SCHEDULED)
        return Response({"status": instance.status})


class SystemConfigurationView(RetrieveUpdateAPIView):
    """Singleton settings: dynamic payment amounts + bot card number (Part 3 §4)."""

    serializer_class = SystemConfigurationSerializer
    permission_classes = [CanManageFinancial]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return SystemConfiguration.load()


@method_decorator(sensitive_post_parameters("current_password"), name="dispatch")
class BotSettingsView(APIView):
    permission_classes = [IsCEO]

    def get(self, request):
        return Response(BotSettingsSerializer(SystemConfiguration.load()).data, headers={"Cache-Control": "no-store"})

    def patch(self, request):
        with transaction.atomic():
            actor = get_user_model().objects.select_for_update().get(pk=request.user.pk)
            if not actor.is_active or not (actor.is_superuser or actor.role == actor.Role.CEO):
                return Response(status=status.HTTP_403_FORBIDDEN)
            verification = verify_current_password(actor, request.data.get("current_password"))
            if verification == "locked":
                return Response({"detail": "به‌دلیل تلاش‌های ناموفق، ۱۵ دقیقه بعد دوباره تلاش کنید."}, status=429, headers={"Retry-After": "900"})
            if verification == "invalid":
                return Response({"current_password": ["رمز فعلی مدیر صحیح نیست."]}, status=400)
            SystemConfiguration.load()
            instance = SystemConfiguration.objects.select_for_update().get(pk=SystemConfiguration.SINGLETON_PK)
            serializer = BotSettingsSerializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            expected = serializer.validated_data.pop("expected_updated_at")
            serializer.validated_data.pop("current_password")
            if expected != instance.updated_at:
                return Response({"detail": "تنظیمات توسط کاربر دیگری تغییر کرده است؛ صفحه را تازه کنید."}, status=409)
            before = {field: str(getattr(instance, field)) for field in PAYMENT_FIELDS}
            serializer.save()
            after = {field: str(getattr(instance, field)) for field in PAYMENT_FIELDS}
            if before != after:
                ConfigurationChange.objects.create(actor=actor, actor_username=actor.username, action=ConfigurationChange.Action.UPDATED, before=before, after=after)
            return Response(BotSettingsSerializer(instance).data, headers={"Cache-Control": "no-store"})


class BaleApplicationFormView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .blank_form import generate_application_form

        instance = SystemConfiguration.load()
        if request.query_params.get("version") not in (None, instance.updated_at.isoformat()):
            return Response({"detail": "اطلاعات پرداخت تغییر کرده است؛ دوباره فرم را دریافت کنید."}, status=409)
        response = HttpResponse(generate_application_form(instance), content_type="application/pdf")
        response["Content-Disposition"] = 'inline; filename="asa-application-form.pdf"'
        response["Cache-Control"] = "no-store"
        return response
