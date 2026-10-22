"""Resilient multipart client for the Django backend."""

import asyncio
import logging
from decimal import Decimal, InvalidOperation
from dataclasses import dataclass

import httpx

from . import config

logger = logging.getLogger("asa.bot.api")


class BackendError(Exception):
    """Raised when the backend cannot be reached or returns a server error."""


class BackendValidationError(BackendError):
    """Raised on a 4xx — the submission was invalid (e.g. a non-image file).

    Permanent: retrying the same payload won't help, so the bot asks the user to
    correct and resend rather than silently retrying.
    """


@dataclass(frozen=True)
class PaymentConfiguration:
    amount: Decimal
    card_number: str
    account_number: str
    iban: str
    account_holder: str
    version: str


async def get_payment_configuration() -> PaymentConfiguration:
    try:
        async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT) as client:
            response = await client.get(f"{config.BACKEND_API_URL}/public/config/")
            response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Invalid configuration response")
        card = str(payload.get("ceo_card_number", "")).strip()
        amount = Decimal(str(payload["stage_1_amount"]))
        account = str(payload.get("ceo_account_number", "")).strip()
        iban = str(payload.get("ceo_iban", "")).strip()
        holder = str(payload.get("ceo_account_holder", "")).strip()
        version = str(payload.get("updated_at", "")).strip()
        if not (card or account or iban) or not holder or not version:
            raise ValueError("Payment destination is not configured")
        if not amount.is_finite() or amount <= 0:
            raise ValueError("Payment amount is not configured")
        return PaymentConfiguration(amount, card, account, iban, holder, version)
    except (httpx.HTTPError, ValueError, KeyError, InvalidOperation) as error:
        raise BackendError("Payment configuration is unavailable") from error


async def download_application_form(version: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT) as client:
            response = await client.get(f"{config.BACKEND_API_URL}/bale/application-form/", params={"version": version})
            response.raise_for_status()
        if not response.content.startswith(b"%PDF-") or len(response.content) > 5 * 1024 * 1024:
            raise ValueError("Invalid application form")
        return response.content
    except (httpx.HTTPError, ValueError) as error:
        raise BackendError("Application form is unavailable") from error


async def create_bale_request(
    phone: str,
    form_bytes: bytes,
    form_name: str,
    receipt_bytes: bytes,
    receipt_name: str,
) -> str:
    """POST the assembled multipart request and return the tracking code.

    Retries transient network failures and 5xx responses with exponential backoff.
    A 4xx is treated as a permanent error (no retry). Raises :class:`BackendError`
    on final failure.
    """
    url = f"{config.BACKEND_API_URL}/bale/requests/create/"
    files = {
        "form_photo": (form_name, form_bytes, "application/octet-stream"),
        "receipt_photo": (receipt_name, receipt_bytes, "application/octet-stream"),
    }
    data = {"phone": phone}

    last_exc: Exception | None = None
    for attempt in range(1, config.HTTP_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT) as client:
                resp = await client.post(url, data=data, files=files)

            if resp.status_code >= 500:
                raise BackendError(f"server error {resp.status_code}")
            if resp.status_code >= 400:
                # Validation failure — log the body (field errors) and don't retry.
                logger.error("backend rejected request: %s %s", resp.status_code, resp.text)
                raise BackendValidationError(f"client error {resp.status_code}")

            tracking_code = resp.json().get("tracking_code")
            if not tracking_code:
                raise BackendError("missing tracking_code in response")
            return tracking_code

        except BackendValidationError:
            raise  # permanent: the caller surfaces a "fix and resend" message
        except (httpx.TimeoutException, httpx.TransportError, BackendError) as exc:
            last_exc = exc
            if attempt == config.HTTP_MAX_RETRIES:
                break
            delay = config.HTTP_RETRY_BACKOFF ** attempt
            logger.warning(
                "attempt %s/%s failed (%s); retrying in %.1fs",
                attempt, config.HTTP_MAX_RETRIES, exc, delay,
            )
            await asyncio.sleep(delay)

    raise BackendError(str(last_exc))
