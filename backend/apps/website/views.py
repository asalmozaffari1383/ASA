from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny

from apps.common.permissions import IsCEO

from .models import CompanyPartner, ServiceCard
from .serializers import CompanyPartnerSerializer, ServiceCardSerializer


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


class CompanyPartnerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCEO]
    serializer_class = CompanyPartnerSerializer
    pagination_class = None
    queryset = CompanyPartner.objects.all()
