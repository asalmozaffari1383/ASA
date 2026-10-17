"""Rate-limit tests for the tracking endpoint (Part 5 §4)."""

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class TrackingThrottleTests(APITestCase):
    def setUp(self):
        # DRF throttling keeps counters in the cache; isolate each test.
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_sixth_request_within_a_minute_is_throttled(self):
        url = reverse("requests:track")
        # TrackingRateThrottle is configured at 5/min. The first five anonymous
        # hits are allowed (404 for an unknown code), the sixth is blocked.
        for i in range(5):
            resp = self.client.get(url, {"code": "ASA-0000"})
            self.assertNotEqual(
                resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS,
                f"request #{i + 1} should not be throttled",
            )

        blocked = self.client.get(url, {"code": "ASA-0000"})
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
