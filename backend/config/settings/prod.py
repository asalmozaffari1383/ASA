"""Production settings.

Hardened defaults. Secrets, hosts, ArvanCloud credentials and the Kavenegar API
key all come from the environment — nothing sensitive is committed. USE_S3 and
SMS_BACKEND are expected to be set to ``True``/``kavenegar`` respectively.
"""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False

# Required in production; fail loudly if missing.
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
SECRET_KEY = env("DJANGO_SECRET_KEY")

# --- Security headers -------------------------------------------------------
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
# Behind a TLS-terminating proxy (typical for ArvanCloud / nginx ingress).
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
