import logging

from botocore.exceptions import BotoCoreError, ClientError
from rest_framework.exceptions import APIException
from django.db import transaction
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from apps.common.permissions import IsCEO

from .models import CompanyPartner, ContactSettings, ServiceCard
from .serializers import CompanyPartnerSerializer, ContactSettingsSerializer, ServiceCardSerializer


class PublicServiceList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ServiceCardSerializer
    pagination_class = None
    queryset = ServiceCard.objects.filter(is_active=True)


class ServiceCardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCEO]
    serializer_class = ServiceCardSerializer
    pagination_class = None
    queryset = ServiceCard.objects.all()


class PublicServiceDetail(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ServiceCardSerializer
    queryset = ServiceCard.objects.filter(is_active=True)


class PublicPartnerList(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = CompanyPartnerSerializer
    pagination_class = None
    queryset = CompanyPartner.objects.filter(is_active=True).exclude(logo="")


class StorageUnavailable(APIException):
    status_code = 503
    default_detail = "ارتباط با فضای ذخیره فایل برقرار نشد. تنظیمات دسترسی فضای فایل باید بررسی شود."
    default_code = "storage_unavailable"


class CompanyPartnerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCEO]
    serializer_class = CompanyPartnerSerializer
    pagination_class = None
    queryset = CompanyPartner.objects.all()

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        super().perform_update(serializer)

    def handle_exception(self, exc):
        if isinstance(exc, (ClientError, BotoCoreError)):
            code = exc.response.get("Error", {}).get("Code", "unknown") if isinstance(exc, ClientError) else type(exc).__name__
            logging.getLogger(__name__).error("Partner logo storage failure (%s)", code)
            exc = StorageUnavailable()
        return super().handle_exception(exc)


class PublicContactSettings(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = ContactSettingsSerializer

    def get_object(self):
        return ContactSettings.load()

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response


class ManageContactSettings(PublicContactSettings, generics.RetrieveUpdateAPIView):
    permission_classes = [IsCEO]
    http_method_names = ["get", "patch", "head", "options"]
