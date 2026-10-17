from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BaleCreateView,
    CeoCertificateViewSet,
    FinalPaymentView,
    FixUploadView,
    PostalCodeCheckView,
    PublicSubmitView,
    SecretaryRequestViewSet,
    TrackingView,
)

app_name = "requests"

router = DefaultRouter()
router.register("secretary/requests", SecretaryRequestViewSet,
                basename="secretary-requests")
router.register("ceo/certificate-requests", CeoCertificateViewSet,
                basename="ceo-certificate-requests")

urlpatterns = [
    # Public / anonymous
    path("requests/public-submit/", PublicSubmitView.as_view(), name="public-submit"),
    path("requests/track/", TrackingView.as_view(), name="track"),
    path(
        "requests/check-postal-code/",
        PostalCodeCheckView.as_view(),
        name="check-postal-code",
    ),
    path(
        "requests/<str:tracking_code>/fixes/<str:defect_key>/",
        FixUploadView.as_view(),
        name="fix-upload",
    ),
    path(
        "requests/<str:tracking_code>/final-payment/",
        FinalPaymentView.as_view(),
        name="final-payment",
    ),
    # Bale bot intake
    path("bale/requests/create/", BaleCreateView.as_view(), name="bale-create"),
] + router.urls
