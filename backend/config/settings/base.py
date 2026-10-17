"""Base settings shared by every environment.

Almost everything here is driven by environment variables (via ``django-environ``)
so the same image runs in development against MinIO/console-SMS and in production
against ArvanCloud/Kavenegar with only env changes. Environment-specific overrides
live in ``dev.py`` and ``prod.py``.
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

# backend/ — the directory containing manage.py.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
# Load a local .env file if present (ignored in containers, which inject env directly).
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# --- Core -------------------------------------------------------------------
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="insecure-dev-key-change-me-in-production",
)
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Applications -----------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "storages",
]

LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.requests",
    "apps.financials",
    "apps.inspections",
    "apps.certificates",
    "apps.website",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database ---------------------------------------------------------------
# DATABASE_URL e.g. postgres://user:pass@db:5432/asa
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://postgres:postgres@localhost:5432/asa",
    ),
}

# --- Auth -------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internationalization ---------------------------------------------------
LANGUAGE_CODE = "fa-ir"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

# --- Static files -----------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Storage (S3-compatible vs local) ---------------------------------------
# When USE_S3 is on, all media is piped to an S3-compatible bucket (ArvanCloud in
# prod, MinIO in dev). When off, Django's local filesystem storage is used so a
# contributor can run the backend with no object-storage service at all.
USE_S3 = env.bool("USE_S3", default=False)

if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    # ArvanCloud: https://s3.ir-thr-at1.arvanstorage.ir ; MinIO: http://minio:9000
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="")
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default="")
    # MinIO needs path-style addressing; ArvanCloud accepts it too.
    AWS_S3_ADDRESSING_STYLE = env("AWS_S3_ADDRESSING_STYLE", default="path")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_QUERYSTRING_EXPIRE = env.int("AWS_QUERYSTRING_EXPIRE", default=3600)

    STORAGES = {
        "default": {"BACKEND": "apps.common.storages.MediaS3Storage"},
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        },
    }
else:
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        },
    }

# --- SMS (pluggable backend) ------------------------------------------------
# "console" logs messages (dev); "kavenegar" hits the Kavenegar API (prod).
SMS_BACKEND = env("SMS_BACKEND", default="console")
KAVENEGAR_API_KEY = env("KAVENEGAR_API_KEY", default="")
KAVENEGAR_SENDER = env("KAVENEGAR_SENDER", default="")
# Kavenegar template (lookup) names fired by the status state machine.
SMS_TEMPLATE_REPORT_READY = env("SMS_TEMPLATE_REPORT_READY", default="asa-report-ready")
SMS_TEMPLATE_CERTIFICATE_READY = env(
    "SMS_TEMPLATE_CERTIFICATE_READY", default="asa-certificate-ready"
)

# --- Django REST Framework --------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Secure by default; public endpoints opt out with AllowAny.
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        # Scoped rates consumed by the custom throttles in apps.common.throttles.
        "tracking": "5/min",
        "bale_create": "20/hour",
        "public_submit": "10/hour",
        "postal_code_check": "30/min",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # SearchFilter/OrderingFilter stay inert until a view declares search_fields /
    # ordering_fields, so enabling them globally has no effect on existing views.
    "DEFAULT_FILTER_BACKENDS": (
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
}

# --- Simple JWT -------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_MINUTES", default=30)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- CORS -------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Logging ----------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        # The console SMS backend logs here; surfaces messages in dev.
        "asa.sms": {"handlers": ["console"], "level": "INFO", "propagate": False},
        # WeasyPrint + fontTools are extremely chatty at INFO (per-glyph subsetting);
        # keep them at WARNING so certificate generation doesn't flood the logs.
        "weasyprint": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "fontTools": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "fontTools.subset": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
