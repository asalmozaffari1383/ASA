from decimal import Decimal
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

import httpx

from bot import messages
from bot.api_client import BackendError, PaymentConfiguration, download_application_form, get_payment_configuration
from bot.main import begin_request, handle_message, store
from bot.states import State


class BotIntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.chat_id = 123
        store.reset(self.chat_id)
        self.bot = SimpleNamespace(
            send_message=AsyncMock(), send_document=AsyncMock(),
            get_file=AsyncMock(return_value=b"image bytes"),
        )

    async def test_missing_payment_configuration_does_not_begin_collection(self):
        with patch("bot.main.get_payment_configuration", side_effect=BackendError):
            await begin_request(self.bot, self.chat_id)
        self.assertEqual(store.get(self.chat_id).state, State.IDLE)
        self.bot.send_document.assert_not_awaited()
        self.assertEqual(self.bot.send_message.await_args.args[1], messages.PAYMENT_UNAVAILABLE)

    async def test_live_payment_details_and_submission_tracking(self):
        payment = PaymentConfiguration(Decimal("500000"), "1111222233334444", "", "", "شرکت آسا", "version")
        with patch("bot.main.get_payment_configuration", return_value=payment), patch("bot.main.download_application_form", return_value=b"%PDF-live") as download:
            await begin_request(self.bot, self.chat_id)
        download.assert_awaited_once_with("version")
        caption = self.bot.send_document.await_args.kwargs["caption"]
        self.assertIn("1111222233334444", caption)
        self.assertIn("500,000 ریال", caption)
        await handle_message(self.bot, SimpleNamespace(chat_id=self.chat_id, text="۰۹۱۲۳۴۵۶۷۸۹"))
        self.assertEqual(store.get(self.chat_id).phone, "09123456789")
        photo = SimpleNamespace(chat_id=self.chat_id, photos=[SimpleNamespace(file_id="photo")])
        await handle_message(self.bot, photo)
        with patch("bot.main.create_bale_request", return_value="ASA-TEST") as submit:
            await handle_message(self.bot, photo)
        self.assertEqual(submit.await_args.args, ("09123456789", b"image bytes", "image.jpg", b"image bytes", "image.jpg"))
        self.assertEqual(store.get(self.chat_id).state, State.IDLE)
        self.assertIn("ASA-TEST", self.bot.send_message.await_args.args[1])

    async def test_payment_configuration_validation(self):
        cases = [
            ({"ceo_card_number": "1111222233334444", "stage_1_amount": "500000"}, True),
            ({"ceo_card_number": "", "stage_1_amount": "500000"}, False),
            ({"ceo_card_number": "1111222233334444", "stage_1_amount": "0"}, False),
            ({"ceo_card_number": "1111222233334444", "stage_1_amount": "NaN"}, False),
        ]
        for payload, valid in cases:
            with self.subTest(payload=payload):
                payload = {"ceo_account_holder": "شرکت آسا", "updated_at": "version", **payload}
                response = httpx.Response(200, json=payload, request=httpx.Request("GET", "https://example.com"))
                with patch("bot.api_client.httpx.AsyncClient") as client:
                    client.return_value.__aenter__.return_value.get = AsyncMock(return_value=response)
                    if valid:
                        self.assertEqual((await get_payment_configuration()).amount, Decimal("500000"))
                    else:
                        with self.assertRaises(BackendError):
                            await get_payment_configuration()

    async def test_pdf_failure_prevents_payment_instructions_and_collection(self):
        payment = PaymentConfiguration(Decimal("500000"), "", "123456789", "", "شرکت آسا", "version")
        with patch("bot.main.get_payment_configuration", return_value=payment), patch("bot.main.download_application_form", side_effect=BackendError):
            await begin_request(self.bot, self.chat_id)
        self.bot.send_document.assert_not_awaited()
        self.assertEqual(store.get(self.chat_id).state, State.IDLE)

    async def test_account_only_configuration(self):
        payload = {"stage_1_amount": "500000", "ceo_account_number": "123456789", "ceo_account_holder": "شرکت آسا", "updated_at": "v1"}
        response = httpx.Response(200, json=payload, request=httpx.Request("GET", "https://example.com"))
        with patch("bot.api_client.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.get = AsyncMock(return_value=response)
            payment = await get_payment_configuration()
        self.assertIn("شماره حساب: 123456789", messages.start_payment_text(payment))

    async def test_download_rejects_conflict_non_pdf_and_oversize(self):
        for code, content in [(409, b"conflict"), (200, b"html"), (200, b"%PDF-" + b"x" * (5 * 1024 * 1024))]:
            with self.subTest(code=code, size=len(content)), patch("bot.api_client.httpx.AsyncClient") as client:
                response = httpx.Response(code, content=content, request=httpx.Request("GET", "https://example.com"))
                client.return_value.__aenter__.return_value.get = AsyncMock(return_value=response)
                with self.assertRaises(BackendError):
                    await download_application_form("v1")

    async def test_download_passes_version_and_returns_pdf(self):
        with patch("bot.api_client.httpx.AsyncClient") as client:
            fetch = AsyncMock(return_value=httpx.Response(200, content=b"%PDF-test", request=httpx.Request("GET", "https://example.com")))
            client.return_value.__aenter__.return_value.get = fetch
            self.assertEqual(await download_application_form("v1"), b"%PDF-test")
            self.assertEqual(fetch.await_args.kwargs["params"], {"version": "v1"})


class PhoneTests(unittest.TestCase):
    def test_persian_arabic_and_international_numbers(self):
        for number in ("۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩", "+98 912 345 6789", "00989123456789"):
            self.assertEqual(messages.normalize_phone(number), "09123456789")
        self.assertEqual(messages.normalize_phone("123"), "")
