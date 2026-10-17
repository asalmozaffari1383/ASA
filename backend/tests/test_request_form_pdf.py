from datetime import date

from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.requests.models import InspectionRequest
from apps.requests.pdf import _display, _jalali_date, _tri_state, render_bale_form_html
from .factories import make_request, make_user


class FormContentTests(SimpleTestCase):
    def test_jalali_leap_year_boundaries(self):
        for gregorian, expected in [
            (date(2024, 3, 20), "۱۴۰۳/۰۱/۰۱"),
            (date(2025, 3, 20), "۱۴۰۳/۱۲/۳۰"),
            (date(2025, 3, 21), "۱۴۰۴/۰۱/۰۱"),
        ]:
            with self.subTest(gregorian=gregorian):
                self.assertEqual(_jalali_date(gregorian), expected)

    def test_missing_values_are_distinct_from_zero_and_false(self):
        self.assertEqual(_display(0), "۰")
        self.assertEqual(_display(None), "ثبت نشده")
        self.assertEqual(_tri_state(False), "ندارد")
        self.assertEqual(_tri_state(None), "اعلام نشده")

    def test_actual_content_escaped_and_long_notes_preserved(self):
        note = "توضیحات کامل سامانه ایمنی\n" * 100
        request = InspectionRequest(
            company_name='<script>alert("test")</script>',
            source="website", request_date=date(2025, 3, 21),
            total_area_land=0, has_fire_alarm_system=False,
            fire_alarm_details=note,
        )
        html = render_bale_form_html(request)
        self.assertIn("&lt;script&gt;", html)
        self.assertNotIn("<script>", html)
        self.assertIn(note, html)
        self.assertIn("۱۴۰۴/۰۱/۰۱", html)
        self.assertIn("وب‌سایت", html)
        self.assertNotIn("تصویر فرم ارسالی بله", html)
        request.source = "bale"
        self.assertIn("تصویر فرم ارسالی بله", render_bale_form_html(request))


class FormDownloadTests(APITestCase):
    def setUp(self):
        self.request = make_request()
        self.url = reverse("requests:secretary-requests-form-pdf", args=[self.request.id])

    def test_download_requires_authentication_and_permission(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.client.force_authenticate(make_user(can_fill_bale_forms=False))
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_authorized_download_is_real_pdf_for_saved_request(self):
        self.client.force_authenticate(make_user(can_fill_bale_forms=True))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn(self.request.tracking_code, response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF-"))
        self.assertGreater(len(response.content), 10_000)
