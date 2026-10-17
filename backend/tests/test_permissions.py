"""RBAC / dynamic-permission matrix tests (Part 2 §1, Part 3 §4)."""

import tempfile

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.financials.models import FinancialRecord
from apps.requests.models import InspectionRequest
from .factories import make_payment, make_report, make_request, make_user

_TMP_MEDIA = tempfile.mkdtemp(prefix="asa-test-perm-")


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class FinancialPermissionTests(APITestCase):
    def setUp(self):
        self.request = make_request(status=InspectionRequest.Status.PENDING_PAYMENT)
        self.payment = make_payment(self.request, FinancialRecord.Stage.STAGE_1)
        self.url = reverse("financials:payments-approve", args=[self.payment.id])

    def test_unauthenticated_is_401(self):
        self.assertEqual(self.client.post(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_flag_is_403(self):
        # A CEO by role but WITHOUT the financial flag must still be blocked.
        self.client.force_authenticate(make_user(role="ceo", can_manage_financial=False))
        self.assertEqual(self.client.post(self.url).status_code, status.HTTP_403_FORBIDDEN)
        self.payment.refresh_from_db()
        self.assertFalse(self.payment.is_approved)

    def test_user_with_flag_can_approve(self):
        self.client.force_authenticate(make_user(role="secretary", can_manage_financial=True))
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertTrue(self.payment.is_approved)


class CertificatePermissionTests(APITestCase):
    def setUp(self):
        self.request = make_request(status=InspectionRequest.Status.UNDER_REVIEW)
        make_report(self.request)
        self.url = reverse(
            "requests:ceo-certificate-requests-issue-certificate", args=[self.request.id]
        )

    def test_user_without_issue_flag_is_403_regardless_of_role(self):
        self.client.force_authenticate(make_user(role="ceo", can_issue_certificate=False))
        self.assertEqual(self.client.post(self.url).status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_issue_flag_passes_permission_layer(self):
        # With the flag, permission passes — the request then fails the *business*
        # guardrail (400), not the permission layer (403). That distinction is the
        # point: RBAC and gating are separate.
        self.client.force_authenticate(make_user(role="expert", can_issue_certificate=True))
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class ExpertAndSecretaryGuardTests(APITestCase):
    def test_scheduled_list_blocked_without_inspection_flag(self):
        url = reverse("inspections:scheduled-requests")
        self.client.force_authenticate(make_user(can_do_inspection=False))
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)

    def test_secretary_queue_blocked_without_bale_flag(self):
        url = reverse("requests:secretary-requests-list")
        self.client.force_authenticate(make_user(can_fill_bale_forms=False))
        self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
