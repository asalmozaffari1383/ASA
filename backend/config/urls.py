"""Root URL configuration.

JWT auth endpoints are wired up now so the token flow is testable immediately. The
feature API routers (public intake, tracking, Bale, staff) are added in Step 4 under
the ``/api/`` prefix.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # --- Authentication (JWT) ---
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # --- Feature APIs ---
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.requests.urls")),
    path("api/", include("apps.financials.urls")),
    path("api/", include("apps.inspections.urls")),
    path("api/", include("apps.website.urls")),
]

# In local development with filesystem storage (USE_S3 off), let Django serve the
# uploaded media so receipts/fix images are viewable in the browser. In production
# (USE_S3 on / DEBUG off) media is served from S3 and this is skipped.
if settings.DEBUG and not settings.USE_S3:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
