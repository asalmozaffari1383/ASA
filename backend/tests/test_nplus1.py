"""N+1 prevention tests — query counts must not grow with row count (Part 5 §2)."""

import tempfile

from django.core.cache import cache
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.financials.models import FinancialRecord
from apps.inspections.models import InspectionPhoto
from apps.requests.models import InspectionRequest
from .factories import make_payment, make_report, make_request, make_user, png_upload

_TMP_MEDIA = tempfile.mkdtemp(prefix="asa-test-nplus1-")


@override_settings(MEDIA_ROOT=_TMP_MEDIA)
class NPlusOneTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_financial_list_query_count_is_constant(self):
        """The CEO payments list must issue the same number of queries
        whether there are 2 records or 10 (select_related at work)."""
        self.client.force_authenticate(make_user(can_manage_financial=True))
        url = reverse("financials:payments-list")

        for _ in range(2):
            make_payment(make_request(InspectionRequest.Status.PENDING_PAYMENT),
                         FinancialRecord.Stage.STAGE_1)
        with CaptureQueriesContext(connection) as few:
            self.assertEqual(self.client.get(url).status_code, 200)

        for _ in range(8):
            make_payment(make_request(InspectionRequest.Status.PENDING_PAYMENT),
                         FinancialRecord.Stage.STAGE_1)
        with CaptureQueriesContext(connection) as many:
            self.assertEqual(self.client.get(url).status_code, 200)

        self.assertEqual(len(few.captured_queries), len(many.captured_queries))

    def test_tracking_view_query_count_is_constant(self):
        """Tracking a request must not issue extra queries per photo/payment."""
        request = make_request(InspectionRequest.Status.UNDER_REVIEW)
        report = make_report(request, has_covered_space_without_alarm=True, is_alarm_fixed=False)
        make_payment(request, FinancialRecord.Stage.STAGE_1, approved=True)
        InspectionPhoto.objects.create(report=report, photo=png_upload())
        url = reverse("requests:track")

        cache.clear()
        with CaptureQueriesContext(connection) as small:
            self.assertEqual(self.client.get(url, {"code": request.tracking_code}).status_code, 200)

        # Scale up related rows; query count must stay flat.
        for _ in range(5):
            InspectionPhoto.objects.create(report=report, photo=png_upload())
        make_payment(request, FinancialRecord.Stage.STAGE_2, approved=False)

        cache.clear()
        with CaptureQueriesContext(connection) as large:
            self.assertEqual(self.client.get(url, {"code": request.tracking_code}).status_code, 200)

        self.assertEqual(len(small.captured_queries), len(large.captured_queries))
        # And the absolute budget is small (select_related + 2 prefetches).
        self.assertLessEqual(len(small.captured_queries), 4)
