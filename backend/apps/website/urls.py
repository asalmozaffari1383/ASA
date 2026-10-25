from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CompanyPartnerViewSet, PublicPartnerList, PublicServiceDetail,
    PublicPageContent, ManagePageContent,
    PublicServiceList, ServiceCardViewSet, PublicContactSettings, ManageContactSettings,
)

router = DefaultRouter()
router.register("ceo/site-services", ServiceCardViewSet, basename="site-services")
router.register("ceo/site-partners", CompanyPartnerViewSet, basename="site-partners")

urlpatterns = [
    path("public/page-content/", PublicPageContent.as_view(), name="public-page-content"),
    path("ceo/page-content/", ManagePageContent.as_view(), name="page-content"),
    path("public/contact/", PublicContactSettings.as_view(), name="public-contact"),
    path("ceo/site-contact/", ManageContactSettings.as_view(), name="site-contact"),
    path("public/services/", PublicServiceList.as_view(), name="public-services"),
    path("public/services/<int:pk>/", PublicServiceDetail.as_view(), name="public-service-detail"),
    path("public/partners/", PublicPartnerList.as_view(), name="public-partners"),
    path("", include(router.urls)),
]
