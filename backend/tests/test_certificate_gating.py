"""Certificate issuance guardrail tests (Part 3 §4)."""

import tempfile

from django.core.files.storage import default_storage
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.financials.models import FinancialRecord
from apps.requests.models import InspectionRequest
from .factories import make_payment, make_report, make_request, make_user

_TMP_MEDIA = tempfile.mkdtemp(prefix="asa-test-media-")


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class CertificateGatingTests(APITestCase):
    def setUp(self):
        self.request = make_request(status=InspectionRequest.Status.UNDER_REVIEW)
        self.issuer = make_user(role="ceo", can_issue_certificate=True)
        self.client.force_authenticate(self.issuer)
        self.url = reverse(
            "requests:ceo-certificate-requests-issue-certificate", args=[self.request.id]
        )

    def _issue(self, **data):
        return self.client.post(self.url, data)

    def test_blocked_when_stage2_missing_and_defect_unfixed(self):
        # A raised but unfixed alarm defect, and no stage-2 payment at all.
        make_report(self.request, has_covered_space_without_alarm=True, is_alarm_fixed=False)
        resp = self._issue()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        reasons = " ".join(resp.json()["reasons"])
        self.assertIn("تسویه نهایی", reasons)        # stage-2 not approved
        self.assertIn("نقص رفع‌نشده", reasons)        # defect unresolved
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.UNDER_REVIEW)

    def test_blocked_when_single_defect_unfixed_despite_payment(self):
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=True)
        make_report(self.request, has_covered_space_without_alarm=True, is_alarm_fixed=False)
        resp = self._issue()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        reasons = " ".join(resp.json()["reasons"])
        self.assertIn("نقص رفع‌نشده", reasons)
        self.assertNotIn("تسویه نهایی", reasons)  # payment side is satisfied

    def test_requires_confirmation_when_payment_unapproved(self):
        # Payment is now a *soft* check: without confirmation issuance is refused,
        # but it is flagged as confirmable rather than a hard block.
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=False)
        make_report(self.request)  # no defects raised
        resp = self._issue()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        body = resp.json()
        self.assertTrue(body.get("requires_confirmation"))
        self.assertIn("تسویه نهایی", " ".join(body["reasons"]))
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.UNDER_REVIEW)

    def test_force_issue_when_payment_unapproved(self):
        # With explicit confirmation (force=true) the certificate issues despite the
        # unapproved receipt, as long as the hard requirements are met.
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=False)
        make_report(self.request)  # no defects raised
        resp = self._issue(force="true")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.json()["certificate_url"])
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.COMPLETED)

    def test_force_does_not_bypass_hard_blockers(self):
        # force=true must NOT override unfixed defects (a hard blocker).
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=True)
        make_report(self.request, has_covered_space_without_alarm=True, is_alarm_fixed=False)
        resp = self._issue(force="true")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("نقص رفع‌نشده", " ".join(resp.json()["reasons"]))
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.UNDER_REVIEW)

    def test_success_when_all_conditions_met(self):
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=True)
        make_report(
            self.request, has_covered_space_without_alarm=True, is_alarm_fixed=True
        )
        resp = self._issue()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        body = resp.json()
        self.assertIn("certificate_url", body)
        self.assertTrue(body["certificate_url"])

        # State advanced to completed...
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.COMPLETED)

        # ...and the PDF was actually generated and stored.
        path = f"certificates/{self.request.tracking_code}.pdf"
        self.assertTrue(default_storage.exists(path))
        with default_storage.open(path, "rb") as fh:
            self.assertEqual(fh.read(5), b"%PDF-")
