"""Bot configuration, sourced from environment variables.

Defaults keep the module importable (and unit-testable) without a real token; the
token is only *required* at run time, validated in ``main.run_bot``.
"""

import os
from pathlib import Path

BALE_BOT_TOKEN = os.environ.get("BALE_BOT_TOKEN", "")
BOT_STATE_DIR = os.environ.get("BOT_STATE_DIR", str(Path.home() / ".asa-bot"))

# Backend API root. Inside docker-compose the bot reaches the web service by name.
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://web:8000/api").rstrip("/")

# Shown to the user for the stage-1 down payment.
PUBLIC_SITE_URL = os.environ.get("PUBLIC_SITE_URL", "https://asaeng.org").rstrip("/")

# HTTP resilience knobs for the backend multipart upload.
HTTP_TIMEOUT = float(os.environ.get("BOT_HTTP_TIMEOUT", "20"))
HTTP_MAX_RETRIES = int(os.environ.get("BOT_HTTP_RETRIES", "3"))
HTTP_RETRY_BACKOFF = float(os.environ.get("BOT_HTTP_BACKOFF", "1.5"))
