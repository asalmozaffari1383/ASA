"""ASA Bale bot — conversation state machine (Part 4).

Flow: /start shows a 4-option menu. Choosing "ثبت درخواست بازرسی" sends the blank
form PDF + CEO card number, then walks the user through:
  WAITING_FOR_PHONE -> WAITING_FOR_FORM_PHOTO -> WAITING_FOR_RECEIPT_PHOTO
and finally POSTs everything to the backend, returning the tracking code.

The core logic lives in :func:`handle_message`, which is decoupled from the bale
event loop so it can be unit-tested with fake message/bot objects.
"""

import logging
import sys

import bale
from bale import InputFile, MenuKeyboardButton, MenuKeyboardMarkup

from . import config, messages
from .api_client import BackendError, BackendValidationError, create_bale_request, get_payment_configuration, download_application_form
from .states import SessionStore, State
from .polling import PersistentUpdater, PollingCheckpoint

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("asa.bot")

store = SessionStore()


# --- Keyboards --------------------------------------------------------------
def main_menu() -> MenuKeyboardMarkup:
    markup = MenuKeyboardMarkup()
    markup.add(MenuKeyboardButton(messages.BTN_NEW_REQUEST), row=1)
    markup.add(MenuKeyboardButton(messages.BTN_ABOUT), row=2)
    markup.add(MenuKeyboardButton(messages.BTN_CONTACT), row=2)
    markup.add(MenuKeyboardButton(messages.BTN_HELP), row=3)
    return markup


def contact_menu() -> MenuKeyboardMarkup:
    markup = MenuKeyboardMarkup()
    # Native one-tap verified contact sharing (Part 4 §3).
    markup.add(MenuKeyboardButton(messages.BTN_SHARE_CONTACT, request_contact=True), row=1)
    return markup


def extract_image(message) -> tuple[str | None, str]:
    """Return (file_id, filename) for an *image* upload, or (None, '').

    Photos are always images. A document is accepted only when its MIME type is an
    image (e.g. someone attaches a JPG as a file) — PDFs and other documents are
    rejected here so the user is told to send a photo before we hit the backend.
    """
    photos = getattr(message, "photos", None)
    if photos:
        return photos[-1].file_id, "image.jpg"
    document = getattr(message, "document", None)
    if document:
        mime = (getattr(document, "mime_type", "") or "").lower()
        if mime.startswith("image/"):
            return document.file_id, getattr(document, "file_name", None) or "image.jpg"
    return None, ""


# --- Flow steps -------------------------------------------------------------
async def begin_request(bot, chat_id: int) -> None:
    """Send the blank form + payment info and move to WAITING_FOR_PHONE."""
    try:
        payment = await get_payment_configuration()
        form_bytes = await download_application_form(payment.version)
    except BackendError:
        logger.warning("Payment configuration is unavailable")
        await bot.send_message(chat_id, messages.PAYMENT_UNAVAILABLE, components=main_menu())
        return
    document = InputFile(form_bytes, file_name="asa-application-form.pdf")
    await bot.send_document(chat_id, document, caption=messages.start_payment_text(payment))
    store.get(chat_id).state = State.WAITING_FOR_PHONE
    await bot.send_message(chat_id, messages.ASK_PHONE, components=contact_menu())


async def handle_message(bot, message) -> None:
    """Top-level message dispatcher. All exceptions are caught and apologized for."""
    chat_id = message.chat_id
    try:
        text = (getattr(message, "text", None) or "").strip()
        session = store.get(chat_id)

        # Global reset / entry point.
        if text in ("/start", "start", "/شروع"):
            store.reset(chat_id)
            await bot.send_message(chat_id, messages.WELCOME, components=main_menu())
            return

        if session.state == State.IDLE:
            await _handle_idle(bot, chat_id, text)
        elif session.state == State.WAITING_FOR_PHONE:
            await _handle_phone(bot, message, chat_id, text)
        elif session.state == State.WAITING_FOR_FORM_PHOTO:
            await _handle_form_photo(bot, message, chat_id)
        elif session.state == State.WAITING_FOR_RECEIPT_PHOTO:
            await _handle_receipt_photo(bot, message, chat_id)
    except Exception:  # noqa: BLE001 - last line of defense; must not crash the bot
        logger.exception("Unhandled error while processing message from chat %s", chat_id)
        try:
            await bot.send_message(chat_id, messages.GENERIC_ERROR)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to deliver apology message")


async def _handle_idle(bot, chat_id: int, text: str) -> None:
    if text == messages.BTN_NEW_REQUEST:
        await begin_request(bot, chat_id)
    elif text == messages.BTN_ABOUT:
        await bot.send_message(chat_id, messages.ABOUT)
    elif text == messages.BTN_CONTACT:
        await bot.send_message(chat_id, messages.CONTACT)
    elif text == messages.BTN_HELP:
        await bot.send_message(chat_id, messages.HELP)
    else:
        await bot.send_message(chat_id, messages.USE_MENU, components=main_menu())


async def _handle_phone(bot, message, chat_id: int, text: str) -> None:
    contact = getattr(message, "contact", None)
    raw = contact.phone_number if contact and contact.phone_number else text
    phone = messages.normalize_phone(raw)
    if not phone:
        await bot.send_message(chat_id, messages.INVALID_PHONE, components=contact_menu())
        return
    session = store.get(chat_id)
    session.phone = phone
    session.state = State.WAITING_FOR_FORM_PHOTO
    await bot.send_message(chat_id, messages.ASK_FORM_PHOTO)


async def _handle_form_photo(bot, message, chat_id: int) -> None:
    file_id, name = extract_image(message)
    if not file_id:
        await bot.send_message(chat_id, messages.NEED_IMAGE)
        return
    session = store.get(chat_id)
    session.form_bytes = bytes(await bot.get_file(file_id))
    session.form_name = name
    session.state = State.WAITING_FOR_RECEIPT_PHOTO
    await bot.send_message(chat_id, messages.ASK_RECEIPT_PHOTO)


async def _handle_receipt_photo(bot, message, chat_id: int) -> None:
    file_id, name = extract_image(message)
    if not file_id:
        await bot.send_message(chat_id, messages.NEED_IMAGE)
        return
    receipt_bytes = bytes(await bot.get_file(file_id))
    session = store.get(chat_id)
    await bot.send_message(chat_id, messages.PROCESSING)

    try:
        tracking_code = await create_bale_request(
            session.phone, session.form_bytes, session.form_name, receipt_bytes, name or "receipt.jpg"
        )
    except BackendValidationError:
        # Invalid payload (e.g. an unreadable image) — ask the user to fix & resend.
        logger.exception("Backend rejected submission for chat %s", chat_id)
        await bot.send_message(chat_id, messages.INVALID_SUBMISSION)
        return
    except BackendError:
        # Transient/network/server error — keep state so a resend retries.
        logger.exception("Backend create failed for chat %s", chat_id)
        await bot.send_message(chat_id, messages.API_ERROR)
        return

    store.reset(chat_id)
    await bot.send_message(chat_id, messages.success_text(tracking_code), components=main_menu())


# --- Entrypoint -------------------------------------------------------------
def run_bot() -> None:
    if not config.BALE_BOT_TOKEN:
        raise SystemExit("BALE_BOT_TOKEN environment variable is required.")

    with PollingCheckpoint(config.BOT_STATE_DIR) as checkpoint:
        bot = bale.Bot(token=config.BALE_BOT_TOKEN)
        bot.updater = PersistentUpdater(bot, checkpoint, handle_message)

        @bot.event
        async def on_ready() -> None:
            logger.info("Bot is ready and listening.")

        logger.info("Starting ASA Bale bot...")
        bot.run()


if __name__ == "__main__":
    run_bot()
