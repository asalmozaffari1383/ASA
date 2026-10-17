"""Development settings.

Defaults favour a frictionless local run: DEBUG on, permissive hosts, and the
console SMS backend. Object storage is controlled by USE_S3 — leave it off to use
the local filesystem, or set it on (as docker-compose does) to exercise MinIO.
"""

from .base import *  # noqa: F401,F403
from .base import env

DEBUG = env.bool("DJANGO_DEBUG", default=True)

ALLOWED_HOSTS = env.list(
    "DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"]
)

# Allow the Vite dev server by default.
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://127.0.0.1:5173"],
)
