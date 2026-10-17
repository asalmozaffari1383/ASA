"""Tests for the client-requested changes: website review gate, optional advance
payment, schedule-without-advance, postal-code check, periodic prefill, edit guard."""

import tempfile

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.financials.models import SystemConfiguration
from apps.requests.models import InspectionRequest
from .factories import make_request, make_user, png_upload

_TMP_MEDIA = tempfile.mkdtemp(prefix="asa-test-features-")

_S = InspectionRequest.Status


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class WebsiteReviewGateTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("requests:public-submit")

    def _payload(self, **extra):
        data = dict(
            company_name="شرکت وب",
            ceo_name="مریم احمدی",
            ceo_phone="09121112233",
            address="اصفهان",
            activity_type="خدماتی",
            total_area_land=200,
            total_area_building=150,
            ownership_type="malki",
            inspection_type="initial",
        )
        data.update(extra)
        return data

    def test_website_submit_lands_in_pending_review(self):
        resp = self.client.post(
            self.url, self._payload(stage_1_receipt=png_upload("r.png")),
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        req = InspectionRequest.objects.get(tracking_code=resp.data["tracking_code"])
        self.assertEqual(req.status, _S.PENDING_REVIEW)
        self.assertEqual(req.source, InspectionRequest.Source.WEBSITE)

    def test_receipt_required_by_default(self):
        resp = self.client.post(self.url, self._payload(), format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_receipt_optional_when_setting_on(self):
        cfg = SystemConfiguration.load()
        cfg.allow_inspection_without_advance = True
        cfg.save()
        resp = self.client.post(self.url, self._payload(), format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        req = InspectionRequest.objects.get(tracking_code=resp.data["tracking_code"])
        self.assertEqual(req.payments.count(), 0)

    def test_secretary_approve_moves_pending_review_to_pending_payment(self):
        req = make_request(status=_S.PENDING_REVIEW,
                           source=InspectionRequest.Source.WEBSITE)
        self.client.force_authenticate(make_user(can_fill_bale_forms=True))
        url = reverse("requests:secretary-requests-approve", args=[req.id])
        self.assertEqual(self.client.post(url).status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, _S.PENDING_PAYMENT)


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class SecretaryQueueTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client.force_authenticate(make_user(can_fill_bale_forms=True))
        self.url = reverse("requests:secretary-requests-list")

    def test_queue_includes_bale_and_website_review(self):
        make_request(status=_S.BALE_PHOTO_UPLOADED, source="bale")
        make_request(status=_S.PENDING_REVIEW, source="website")
        make_request(status=_S.SCHEDULED)  # excluded from the default review queue
        resp = self.client.get(self.url)
        got = {r["status"] for r in resp.data["results"]}
        self.assertEqual(got, {"bale_photo_uploaded", "pending_review"})

    def test_source_filter(self):
        make_request(status=_S.BALE_PHOTO_UPLOADED, source="bale")
        make_request(status=_S.PENDING_REVIEW, source="website")
        resp = self.client.get(self.url, {"source": "website"})
        self.assertEqual(len(resp.data["results"]), 1)
        self.assertTrue(all(r["source"] == "website" for r in resp.data["results"]))

    def test_completed_request_not_editable(self):
        req = make_request(status=_S.COMPLETED)
        url = reverse("requests:secretary-requests-detail", args=[req.id])
        resp = self.client.patch(url, {"address": "آدرس جدید"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_scheduled_request_editable(self):
        req = make_request(status=_S.SCHEDULED)
        url = reverse("requests:secretary-requests-detail", args=[req.id])
        resp = self.client.patch(url, {"address": "آدرس جدید"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.address, "آدرس جدید")

    def test_previous_request_prefill_by_phone(self):
        make_request(status=_S.COMPLETED, ceo_phone="09120000000",
                     company_name="مجموعه قدیمی")
        target = make_request(status=_S.PENDING_REVIEW, ceo_phone="09120000000",
                              company_name="")
        url = reverse("requests:secretary-requests-previous")
        resp = self.client.get(url, {"phone": "09120000000", "exclude": str(target.id)})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["found"])
        self.assertEqual(resp.data["data"]["company_name"], "مجموعه قدیمی")

    def test_previous_request_not_found(self):
        url = reverse("requests:secretary-requests-previous")
        resp = self.client.get(url, {"phone": "09129999999"})
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class ScheduleWithoutAdvanceTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.request = make_request(status=_S.PENDING_PAYMENT)
        self.url = reverse("financials:schedule-without-advance", args=[self.request.id])

    def _enable(self):
        cfg = SystemConfiguration.load()
        cfg.allow_inspection_without_advance = True
        cfg.save()

    def test_blocked_when_setting_off(self):
        self.client.force_authenticate(make_user(can_manage_financial=True))
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, _S.PENDING_PAYMENT)

    def test_schedules_when_setting_on(self):
        self._enable()
        self.client.force_authenticate(make_user(can_manage_financial=True))
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, _S.SCHEDULED)

    def test_requires_financial_permission(self):
        self._enable()
        self.client.force_authenticate(make_user(can_manage_financial=False))
        self.assertEqual(self.client.post(self.url).status_code,
                         status.HTTP_403_FORBIDDEN)


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class PostalCodeCheckTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse("requests:check-postal-code")

    def test_reports_existing_and_missing(self):
        make_request(status=_S.PENDING_REVIEW, postal_code="1234567890")
        self.assertTrue(
            self.client.get(self.url, {"postal_code": "1234567890"}).data["exists"]
        )
        self.assertFalse(
            self.client.get(self.url, {"postal_code": "0000000000"}).data["exists"]
        )
