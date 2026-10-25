from django.test import override_settings
from rest_framework.test import APITestCase
from apps.website.models import ContactSettings
from .factories import make_user


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ContactSettingsTests(APITestCase):
    def test_public_reads_defaults_and_cannot_write(self):
        response = self.client.get("/api/public/contact/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response.data["links"][0]["text"], "@imensazanararat")
        self.assertEqual(self.client.patch("/api/public/contact/", {"title": "bad"}).status_code, 405)
        self.assertEqual(self.client.patch("/api/ceo/site-contact/", {"title": "bad"}).status_code, 401)

    def test_only_manager_can_update_and_public_gets_saved_values(self):
        for role in ("secretary", "expert"):
            self.client.force_authenticate(make_user(role=role))
            self.assertEqual(self.client.patch("/api/ceo/site-contact/", {"title": "bad"}).status_code, 403)
        self.client.force_authenticate(make_user(role="ceo"))
        payload = {"title": "ارتباط با شرکت", "services": ["آزمون"], "links": [
            {"kind": "phone", "label": "همراه", "text": "09123456789", "href": "tel:+989123456789"},
            {"kind": "chat", "label": "واتساپ", "text": "گفتگو", "href": "https://wa.me/989123456789"},
        ]}
        response = self.client.patch("/api/ceo/site-contact/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(None)
        response = self.client.get("/api/public/contact/")
        for key, value in payload.items():
            self.assertEqual(response.data[key], value)
        self.assertEqual(ContactSettings.objects.count(), 1)

    def test_unsafe_or_malformed_links_and_oversize_lists_rejected_atomically(self):
        self.client.force_authenticate(make_user(role="ceo"))
        settings = ContactSettings.load()
        for href in ("javascript:alert(1)", "data:text/html,evil", "//evil.com", "https://[broken", "mailto:bad", "tel:bad", "https://user:pass@example.com", "https://example.com/a\nb"):
            response = self.client.patch("/api/ceo/site-contact/", {"title": "changed", "links": [{"kind": "web", "label": "link", "text": "test", "href": href}]}, format="json")
            self.assertEqual(response.status_code, 400, href)
        self.assertEqual(self.client.patch("/api/ceo/site-contact/", {"services": ["test"] * 13}, format="json").status_code, 400)
        settings.refresh_from_db()
        self.assertEqual(settings.title, "تماس با آسا")

    def test_can_remove_cards_and_services_without_restoring_defaults(self):
        self.client.force_authenticate(make_user(role="ceo"))
        response = self.client.patch("/api/ceo/site-contact/", {"links": [], "services": []}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.client.get("/api/public/contact/").data["links"], [])
