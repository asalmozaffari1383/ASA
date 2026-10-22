from datetime import timedelta
from decimal import Decimal

import pymupdf
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.financials.blank_form import generate_application_form
from apps.financials.models import ConfigurationChange, SystemConfiguration
from apps.financials.serializers import SystemConfigurationSerializer
from .factories import make_user


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class BotSettingsTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.manager = make_user(role="ceo", can_manage_financial=True)
        self.config = SystemConfiguration.load()
        self.url = reverse("financials:bot-settings")
        self.client.force_authenticate(self.manager)

    def payload(self, **changes):
        return {
            "stage_1_amount": "30000000", "stage_2_amount": "50000000",
            "ceo_card_number": "6037997512345670", "ceo_account_number": "",
            "ceo_iban": "", "ceo_account_holder": "شرکت آسا",
            "current_password": "pw12345678",
            "expected_updated_at": self.config.updated_at.isoformat(), **changes,
        }

    def update(self, **changes):
        return self.client.patch(self.url, self.payload(**changes), format="json")

    def test_only_manager_can_read_or_write(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        for role in ("secretary", "expert"):
            self.client.force_authenticate(make_user(role=role, can_manage_financial=True))
            self.assertEqual(self.client.get(self.url).status_code, 403)
            self.assertEqual(self.update().status_code, 403)

    def test_save_records_actor_before_after_without_password(self):
        response = self.update()
        self.assertEqual(response.status_code, 200, response.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.stage_1_amount, Decimal("30000000"))
        change = ConfigurationChange.objects.get(action="updated")
        self.assertEqual(change.actor_id, self.manager.pk)
        self.assertEqual(change.before["ceo_card_number"], "")
        self.assertEqual(change.after["ceo_card_number"], "6037997512345670")
        self.assertNotIn("pw12345678", str(response.data) + str(change.before) + str(change.after))
        self.assertNotIn("current_password", response.data)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_missing_password_or_version_never_changes_settings(self):
        for field in ("current_password", "expected_updated_at"):
            payload = self.payload()
            payload.pop(field)
            self.assertEqual(self.client.patch(self.url, payload, format="json").status_code, 400)
        self.config.refresh_from_db()
        self.assertEqual(self.config.stage_1_amount, 0)

    def test_wrong_password_limit_persists_across_cache_clear(self):
        for attempt in range(5):
            self.assertEqual(self.update(current_password="wrong").status_code, 400)
            cache.clear()
        self.assertEqual(ConfigurationChange.objects.filter(action="password_failed").count(), 5)
        self.assertEqual(self.update().status_code, 429)
        self.config.refresh_from_db()
        self.assertEqual(self.config.ceo_card_number, "")
        ConfigurationChange.objects.update(created_at=timezone.now() - timedelta(minutes=16))
        self.assertEqual(self.update().status_code, 200)

    def test_legacy_financial_settings_cannot_bypass_reauthentication(self):
        url = reverse("financials:settings")
        for field in ("stage_1_amount", "stage_2_amount", "ceo_card_number", "ceo_account_number", "ceo_iban", "ceo_account_holder"):
            self.assertEqual(self.client.patch(url, {field: "123456789"}, format="json").status_code, 400)
        self.assertEqual(self.client.put(url, self.payload(), format="json").status_code, 405)
        self.assertEqual(self.client.patch(url, {"allow_inspection_without_advance": True}, format="json").status_code, 200)
        self.config.refresh_from_db()
        self.assertEqual(self.config.stage_1_amount, 0)

    def test_stale_version_and_audit_injection_rejected(self):
        self.assertEqual(self.update().status_code, 200)
        self.assertEqual(self.update(stage_1_amount="10").status_code, 409)
        self.config.refresh_from_db()
        self.assertEqual(self.config.stage_1_amount, Decimal("30000000"))
        self.assertEqual(self.update(actor_username="attacker").status_code, 400)
        self.assertEqual(ConfigurationChange.objects.filter(action="updated").count(), 1)

    def test_legacy_toggle_with_stale_instance_cannot_restore_old_payment_details(self):
        stale = SystemConfiguration.load()
        self.assertEqual(self.update().status_code, 200)
        serializer = SystemConfigurationSerializer(stale, data={"allow_inspection_without_advance": True}, partial=True)
        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.config.refresh_from_db()
        self.assertEqual(self.config.ceo_card_number, "6037997512345670")
        self.assertEqual(self.config.stage_1_amount, Decimal("30000000"))

    def test_invalid_destinations_and_amounts(self):
        for changes in (
            {"ceo_card_number": "1111111111111111"},
            {"ceo_card_number": "6037997512345678"},
            {"ceo_account_number": "12abc"},
            {"ceo_iban": "IR000000000000000000000000"},
            {"ceo_card_number": ""}, {"ceo_account_holder": " "},
            {"stage_1_amount": "0"}, {"stage_1_amount": "-1"},
            {"stage_2_amount": "-1"},
        ):
            with self.subTest(changes=changes):
                self.assertEqual(self.update(**changes).status_code, 400)
        self.assertEqual(ConfigurationChange.objects.count(), 0)

    def test_persian_digits_and_account_only(self):
        response = self.update(ceo_card_number="", ceo_account_number="۱۲۳۴۵۶۷۸۹")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["ceo_account_number"], "123456789")

    def test_iban_only(self):
        remainder = "0540100000000000200300"
        check = 98 - int(remainder + "182700") % 97
        response = self.update(ceo_card_number="", ceo_iban=f"IR{check:02d}{remainder}")
        self.assertEqual(response.status_code, 200, response.data)

    def test_public_config_exposes_no_audit_or_credentials(self):
        self.update()
        self.client.force_authenticate(None)
        response = self.client.get(reverse("financials:public-config"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("ceo_account_holder", response.data)
        self.assertNotIn("recent_changes", response.data)
        self.assertNotIn("password", str(response.data))

    def test_current_pdf_preserves_page_and_replaces_old_payment(self):
        self.assertEqual(self.update().status_code, 200)
        self.config.refresh_from_db()
        self.client.force_authenticate(None)
        url = reverse("financials:bale-application-form")
        response = self.client.get(url, {"version": self.config.updated_at.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        with pymupdf.open(stream=response.content, filetype="pdf") as document:
            self.assertEqual(len(document), 1)
            self.assertAlmostEqual(document[0].rect.width, 595.32, places=1)
            row = document[0].get_text(clip=pymupdf.Rect(52, 594.5, 552, 620))
            self.assertIn("6037997512345670", row)
            self.assertNotIn("6448", row)
            self.assertNotIn("حاهد", row)
        self.assertEqual(self.client.get(url, {"version": "stale"}).status_code, 409)

    def test_maximum_holder_and_html_characters_fit(self):
        self.config.stage_1_amount = Decimal("99999999999999")
        self.config.ceo_account_holder = ("شرکت آسا & <آزمون> " * 8)[:120]
        self.config.ceo_account_number = "123456789012345678901234567890"
        data = generate_application_form(self.config)
        self.assertTrue(data.startswith(b"%PDF-"))

    def test_stolen_manager_session_cannot_reset_or_create_manager(self):
        target = reverse("users:users-detail", args=[self.manager.pk])
        self.assertEqual(self.client.patch(target, {"password": "attacker-password"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(reverse("users:users-list"), {"username": "evil", "password": "attacker-password", "role": "ceo"}, format="json").status_code, 400)
        self.manager.refresh_from_db()
        self.assertTrue(self.manager.check_password("pw12345678"))
        self.assertEqual(self.client.patch(target, {"password": "new-safe-password", "current_password": "pw12345678"}, format="json").status_code, 200)

    def test_ordinary_staff_management_still_works(self):
        response = self.client.post(reverse("users:users-list"), {"username": "staff", "password": "staff-password", "role": "secretary"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        url = reverse("users:users-detail", args=[response.data["id"]])
        self.assertEqual(self.client.patch(url, {"role": "ceo"}, format="json").status_code, 400)
