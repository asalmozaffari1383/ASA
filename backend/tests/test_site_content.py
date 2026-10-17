import json
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.website.models import CompanyPartner, ServiceCard
from .factories import make_user, png_upload


class SiteContentTests(APITestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name, USE_S3=False)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        ServiceCard.objects.all().delete()
        self.first = ServiceCard.objects.create(
            title="بازرسی برق", description="توضیحات برق", specs=["ارتینگ"],
            position=2, default_image="/images/service-electrical.jpg",
        )
        self.second = ServiceCard.objects.create(
            title="بازرسی حریق", description="توضیحات حریق", position=1,
        )
        self.hidden = ServiceCard.objects.create(
            title="پیش‌نویس", description="منتشر نشود", is_active=False,
        )
        self.admin_url = "/api/ceo/site-services/"
        self.public_url = "/api/public/services/"

    def test_public_reads_only_published_services_in_order(self):
        response = self.client.get(self.public_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [self.second.pk, self.first.pk])
        self.assertEqual(response.data[1]["image_url"], "/images/service-electrical.jpg")
        self.assertEqual(self.client.post(self.public_url, {}).status_code, 405)

    def test_empty_public_list_stays_empty(self):
        ServiceCard.objects.update(is_active=False)
        self.assertEqual(self.client.get(self.public_url).data, [])

    def test_anonymous_and_other_staff_cannot_manage_content(self):
        self.assertEqual(self.client.get(self.admin_url).status_code, 401)
        self.assertEqual(self.client.post(self.admin_url, {}).status_code, 401)
        for role in ["expert", "secretary"]:
            self.client.force_authenticate(make_user(role=role, can_manage_financial=True))
            self.assertEqual(self.client.get(self.admin_url).status_code, 403)
            self.assertEqual(self.client.patch(f"{self.admin_url}{self.first.pk}/", {"title": "مجاز نیست"}).status_code, 403)

    def test_ceo_can_create_upload_edit_unpublish_and_clear_image(self):
        self.client.force_authenticate(make_user(role="ceo"))
        response = self.client.post(self.admin_url, {
            "title": "خدمت جدید", "description": "شرح خدمت", "position": 3,
            "specs": json.dumps(["آزمون", "بازرسی"]), "image": png_upload(),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        card_id = response.data["id"]
        self.assertTrue(response.data["image_url"].startswith("/media/website/services/"))
        self.assertEqual(response.data["specs"], ["آزمون", "بازرسی"])
        self.assertTrue(ServiceCard.objects.get(pk=card_id).image.storage.exists(ServiceCard.objects.get(pk=card_id).image.name))
        response = self.client.patch(f"{self.admin_url}{card_id}/", {
            "title": "عنوان ویرایش‌شده", "is_active": "false", "specs": "[]",
            "clear_image": "true",
        }, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["specs"], [])
        self.assertIsNone(response.data["image"])
        self.assertNotIn(card_id, [row["id"] for row in self.client.get(self.public_url).data])
        self.assertEqual(ServiceCard.objects.get(pk=card_id).title, "عنوان ویرایش‌شده")

    def test_invalid_image_and_invalid_features_are_rejected(self):
        self.client.force_authenticate(make_user(role="ceo"))
        detail_url = f"{self.admin_url}{self.first.pk}/"
        fake = SimpleUploadedFile("fake.png", b"<script>not an image</script>", content_type="image/png")
        self.assertEqual(self.client.patch(detail_url, {"image": fake}, format="multipart").status_code, 400)
        for specs in [{"wrong": "shape"}, [5], ["a"] * 9, [" "], ["a" * 101]]:
            self.assertEqual(self.client.patch(detail_url, {"specs": specs}, format="json").status_code, 400)

    def test_superuser_can_manage_content(self):
        self.client.force_authenticate(make_user(role="expert", is_superuser=True))
        self.assertEqual(self.client.get(self.admin_url).status_code, 200)

    def test_detail_content_is_editable_and_hidden_services_are_not_public(self):
        self.client.force_authenticate(make_user(role="ceo"))
        content = {
            "details": "شرح کامل\n\nبند دوم", "applications": "کاربرد اول\nکاربرد دوم",
            "inspection_steps": "بررسی مدارک\nبازدید و گزارش",
        }
        response = self.client.patch(f"{self.admin_url}{self.first.pk}/", content, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(None)
        detail_url = f"{self.public_url}{self.first.pk}/"
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 200)
        for field, value in content.items():
            self.assertEqual(response.data[field], value)
        self.assertEqual(self.client.get(f"{self.public_url}{self.hidden.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"{self.public_url}99999999/").status_code, 404)
        self.assertEqual(self.client.patch(detail_url, content).status_code, 405)
        ServiceCard.objects.filter(pk=self.first.pk).update(is_active=False)
        self.assertEqual(self.client.get(detail_url).status_code, 404)

    def test_service_details_can_be_cleared_and_have_length_limits(self):
        self.client.force_authenticate(make_user(role="ceo"))
        detail_url = f"{self.admin_url}{self.first.pk}/"
        response = self.client.patch(detail_url, {
            "details": "", "applications": "", "inspection_steps": "",
        }, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        for field, limit in [("details", 20000), ("applications", 5000), ("inspection_steps", 5000)]:
            self.assertEqual(self.client.patch(detail_url, {field: "x" * (limit + 1)}).status_code, 400)

    def test_partner_list_only_shows_published_logos_in_order(self):
        CompanyPartner.objects.all().delete()
        second = CompanyPartner.objects.create(name="شرکت دوم", logo=png_upload("second.png"), position=2)
        first = CompanyPartner.objects.create(name="شرکت اول", logo=png_upload("first.png"), position=1)
        CompanyPartner.objects.create(name="شرکت پنهان", logo=png_upload("hidden.png"), is_active=False)
        response = self.client.get("/api/public/partners/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [first.pk, second.pk])
        self.assertTrue(response.data[0]["logo_url"].startswith("/media/website/partners/"))
        self.assertEqual(self.client.post("/api/public/partners/", {}).status_code, 405)
        CompanyPartner.objects.update(is_active=False)
        self.assertEqual(self.client.get("/api/public/partners/").data, [])

    def test_partner_management_requires_ceo(self):
        url = "/api/ceo/site-partners/"
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.post(url, {}).status_code, 401)
        partner = CompanyPartner.objects.create(name="همکار", logo=png_upload())
        for role in ["expert", "secretary"]:
            self.client.force_authenticate(make_user(role=role, can_manage_financial=True))
            self.assertEqual(self.client.get(url).status_code, 403)
            self.assertEqual(self.client.post(url, {"name": "غیرمجاز"}).status_code, 403)
            self.assertEqual(self.client.patch(f"{url}{partner.pk}/", {"name": "غیرمجاز"}).status_code, 403)
            self.assertEqual(self.client.delete(f"{url}{partner.pk}/").status_code, 403)
        self.client.force_authenticate(make_user(role="expert", is_superuser=True))
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_ceo_can_upload_replace_edit_and_hide_partner_logo(self):
        self.client.force_authenticate(make_user(role="ceo"))
        url = "/api/ceo/site-partners/"
        response = self.client.post(url, {
            "name": "شرکت همکار", "logo": png_upload(), "position": 4,
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        partner_id = response.data["id"]
        original_logo = response.data["logo_url"]
        response = self.client.patch(f"{url}{partner_id}/", {
            "name": "نام جدید", "position": "1", "logo": png_upload("replacement.png"),
        }, format="multipart")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotEqual(response.data["logo_url"], original_logo)
        self.assertEqual(CompanyPartner.objects.get(pk=partner_id).name, "نام جدید")
        self.assertTrue(CompanyPartner.objects.get(pk=partner_id).logo.storage.exists(CompanyPartner.objects.get(pk=partner_id).logo.name))
        response = self.client.patch(f"{url}{partner_id}/", {"is_active": "false"}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(partner_id, [row["id"] for row in self.client.get("/api/public/partners/").data])

    def test_partner_logo_is_required_and_must_be_a_real_image(self):
        self.client.force_authenticate(make_user(role="ceo"))
        url = "/api/ceo/site-partners/"
        self.assertEqual(self.client.post(url, {"name": "بدون لوگو"}).status_code, 400)
        fake = SimpleUploadedFile("fake.png", b"<script>invalid</script>", content_type="image/png")
        self.assertEqual(self.client.post(url, {"name": "تصویر نامعتبر", "logo": fake}, format="multipart").status_code, 400)
