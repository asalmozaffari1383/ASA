import json
import shutil
import tempfile
from unittest.mock import patch

from botocore.exceptions import ClientError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.website.models import PageContent
from .factories import make_user
from .test_site_content import png_upload


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class PageContentTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.settings_override = override_settings(MEDIA_ROOT=self.media)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.addCleanup(shutil.rmtree, self.media, True)

    def test_public_defaults_and_write_restrictions(self):
        response = self.client.get("/api/public/page-content/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response.data["content"]["hero_title"], "ایمن سازان آرارات")
        self.assertEqual(response.data["hero_image_url"], "/images/hero.jpg")
        self.assertEqual(len(response.data["content"]["workflow_steps"]), 4)
        self.assertEqual(self.client.patch("/api/public/page-content/", {}).status_code, 405)
        self.assertEqual(self.client.patch("/api/ceo/page-content/", {}).status_code, 401)
        for role in ("secretary", "expert"):
            self.client.force_authenticate(make_user(role=role))
            self.assertEqual(self.client.get("/api/ceo/page-content/").status_code, 403)
            self.assertEqual(self.client.patch("/api/ceo/page-content/", {}).status_code, 403)

    def test_text_edits_merge_and_empty_lists_stay_empty(self):
        self.client.force_authenticate(make_user(role="ceo"))
        response = self.client.patch("/api/ceo/page-content/", {"content": {"hero_title": "عنوان جدید", "about_description": "خط اول\nخط دوم", "pillars": [], "workflow_steps": []}}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["content"]["hero_subtitle"], "دقت در بازرسی، اطمینان در ایمنی")
        self.client.patch("/api/ceo/page-content/", {"content": {"hero_description": ""}}, format="json")
        self.client.force_authenticate(None)
        content = self.client.get("/api/public/page-content/").data["content"]
        self.assertEqual(content["hero_title"], "عنوان جدید")
        self.assertEqual(content["hero_description"], "")
        self.assertEqual(content["pillars"], [])
        self.assertEqual(content["workflow_steps"], [])
        self.assertEqual(PageContent.objects.count(), 1)

    def test_upload_replace_preserve_and_reset_images(self):
        self.client.force_authenticate(make_user(role="ceo"))
        url = "/api/ceo/page-content/"
        response = self.client.patch(url, {"content": json.dumps({"hero_title": "همراه عکس"}), "hero_image": png_upload(), "about_image": png_upload("about.png"), "cta_image": png_upload("cta.png")}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        first = response.data["hero_image_url"]
        self.assertIn("/media/website/pages/", first)
        response = self.client.patch(url, {"content": {"hero_title": "بدون تغییر عکس"}}, format="json")
        self.assertEqual(response.data["hero_image_url"], first)
        response = self.client.patch(url, {"hero_image": png_upload("replacement.png")}, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotEqual(response.data["hero_image_url"], first)
        response = self.client.patch(url, {"clear_hero_image": True, "clear_about_image": True, "clear_cta_image": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["hero_image_url"], "/images/hero.jpg")
        self.assertEqual(response.data["about_image_url"], "/images/service-vessels.jpg")
        self.assertEqual(response.data["cta_image_url"], "/images/cta-firefighter.jpg")

    def test_invalid_content_and_uploads_do_not_change_saved_content(self):
        self.client.force_authenticate(make_user(role="ceo"))
        page = PageContent.load()
        original = page.content
        invalid = [{"pillars": [{"label": ""}]}, {"workflow_steps": [{"title": "x"}]}, {"pillars": [{"label": "x", "detail": ""}] * 9}, {"hero_title": "x" * 301}, {"unknown": "x"}]
        for content in invalid:
            response = self.client.patch("/api/ceo/page-content/", {"content": {"about_title": "bad", **content}}, format="json")
            self.assertEqual(response.status_code, 400, response.data)
        response = self.client.patch("/api/ceo/page-content/", {"hero_image": SimpleUploadedFile("bad.png", b"not an image", content_type="image/png")}, format="multipart")
        self.assertEqual(response.status_code, 400)
        response = self.client.patch("/api/ceo/page-content/", {"clear_hero_image": "true", "hero_image": png_upload()}, format="multipart")
        self.assertEqual(response.status_code, 400)
        page.refresh_from_db()
        self.assertEqual(page.content, original)

    def test_storage_failure_returns_safe_error_and_rolls_back_text(self):
        self.client.force_authenticate(make_user(role="ceo"))
        page = PageContent.load()
        storage = PageContent._meta.get_field("hero_image").storage
        with patch.object(storage, "save", side_effect=ClientError({"Error": {"Code": "AccessDenied"}}, "PutObject")):
            response = self.client.patch("/api/ceo/page-content/", {"content": json.dumps({"hero_title": "bad"}), "hero_image": png_upload()}, format="multipart")
        self.assertEqual(response.status_code, 503)
        page.refresh_from_db()
        self.assertEqual(page.content["hero_title"], "ایمن سازان آرارات")
