"""Pluggable SMS service.

The application sends transactional SMS at defined workflow events (e.g. the
expert submitting a report — Part 3 §3). The *what to send* is decoupled from the
*how to send it* through a small backend interface so we can run a no-network
console backend in development and the Kavenegar gateway in production, selected
purely by configuration.

Configuration (set in ``config.settings`` / env, Step 3):
    SMS_BACKEND        "console" | "kavenegar"   (default: "console")
    KAVENEGAR_API_KEY  str
    KAVENEGAR_SENDER   str   (line number, for free-text sends)

Usage:
    from apps.common.sms import get_sms_service
    get_sms_service().send_template(
        receptor="0912xxxxxxx",
        template="asa-report-ready",
        token=tracking_code,
    )
"""

import abc
import logging

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger("asa.sms")

# Network calls must never hang a request/worker thread indefinitely.
_HTTP_TIMEOUT = 10  # seconds


class SmsDeliveryError(Exception):
    """Raised when a backend fails to hand the message to the provider."""


class BaseSmsBackend(abc.ABC):
    """Interface every SMS backend implements."""

    @abc.abstractmethod
    def send(self, receptor: str, message: str) -> None:
        """Send a free-text message to a single recipient."""

    @abc.abstractmethod
    def send_template(self, receptor: str, template: str, **tokens: str) -> None:
        """Send a templated message via the provider's fast lookup/verify API.

        ``tokens`` map to the provider's template placeholders (Kavenegar accepts
        ``token``, ``token2``, ``token3``...).
        """


class ConsoleSmsBackend(BaseSmsBackend):
    """Development backend: logs the message instead of sending it."""

    def send(self, receptor: str, message: str) -> None:
        logger.info("[SMS:console] to=%s message=%r", receptor, message)

    def send_template(self, receptor: str, template: str, **tokens: str) -> None:
        logger.info(
            "[SMS:console] to=%s template=%s tokens=%s",
            receptor,
            template,
            tokens,
        )


class KavenegarSmsBackend(BaseSmsBackend):
    """Production backend using the Kavenegar REST API.

    Template (lookup/verify) sends are preferred for transactional traffic because
    Kavenegar routes them on a high-priority line for near-instant delivery.
    """

    BASE_URL = "https://api.kavenegar.com/v1/{api_key}/{path}.json"

    def __init__(self, api_key: str | None = None, sender: str | None = None):
        self.api_key = api_key or getattr(settings, "KAVENEGAR_API_KEY", "")
        self.sender = sender or getattr(settings, "KAVENEGAR_SENDER", "")
        if not self.api_key:
            raise ImproperlyConfigured(
                "KAVENEGAR_API_KEY is required for the Kavenegar SMS backend."
            )

    def _post(self, path: str, params: dict) -> None:
        url = self.BASE_URL.format(api_key=self.api_key, path=path)
        try:
            response = requests.post(url, data=params, timeout=_HTTP_TIMEOUT)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.exception("[SMS:kavenegar] delivery failed to %s", params.get("receptor"))
            raise SmsDeliveryError(str(exc)) from exc

    def send(self, receptor: str, message: str) -> None:
        self._post(
            "sms/send",
            {"receptor": receptor, "sender": self.sender, "message": message},
        )

    def send_template(self, receptor: str, template: str, **tokens: str) -> None:
        params = {"receptor": receptor, "template": template}
        params.update(tokens)
        self._post("verify/lookup", params)


# Registry of available backends keyed by the ``SMS_BACKEND`` setting value.
_BACKENDS = {
    "console": ConsoleSmsBackend,
    "kavenegar": KavenegarSmsBackend,
}


def get_sms_service() -> BaseSmsBackend:
    """Instantiate the SMS backend named by ``settings.SMS_BACKEND``."""
    name = getattr(settings, "SMS_BACKEND", "console")
    try:
        backend_cls = _BACKENDS[name]
    except KeyError:
        raise ImproperlyConfigured(
            f"Unknown SMS_BACKEND {name!r}. Choose one of: {', '.join(_BACKENDS)}."
        )
    return backend_cls()
