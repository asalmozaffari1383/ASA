from base64 import b64decode
from io import BytesIO
from unittest.mock import patch

from PIL import Image, ImageDraw
from django.core.files.base import ContentFile
from django.core.files.storage import InMemoryStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.certificates.services import (
    CertificateSignatureError,
    _build_context,
    _signature_data,
    generate_certificate_pdf,
)
from apps.financials.models import FinancialRecord
from apps.requests.models import InspectionRequest
from .factories import make_payment, make_report, make_request, make_user


def signature_bytes(color="blue", transparent=False):
    image = Image.new("RGBA", (600, 300), (0, 0, 0, 0) if transparent else "white")
    drawing = ImageDraw.Draw(image)
    drawing.line([(150, 160), (210, 105), (265, 170), (320, 125), (440, 145)], fill=color, width=5)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


@override_settings(STORAGES={
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class CertificateSignatureTests(APITestCase):
    def setUp(self):
        self.issuer = make_user(role="ceo", can_issue_certificate=True)
        self.expert = make_user(role="expert", can_do_inspection=True)
        self.request = make_request()
        make_report(self.request, expert=self.expert)
        self.client.force_authenticate(self.issuer)

    def store_signature(self, user, color="blue", transparent=False):
        user.signature_image.save(f"{user.pk}.png", ContentFile(signature_bytes(color, transparent)))

    def test_self_uploaded_signature_is_used_for_issuer(self):
        response = self.client.patch(reverse("users:me"), {
            "signature_image": SimpleUploadedFile("signature.png", signature_bytes(), content_type="image/png"),
        }, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.issuer.refresh_from_db()
        context = _build_context(self.request, self.issuer)
        self.assertTrue(context["ceo_signature_url"].startswith("data:image/png;base64,"))
        self.assertIsNone(context["expert_signature_url"])

    def test_private_storage_does_not_require_path_or_public_url(self):
        self.store_signature(self.issuer)
        with patch.object(InMemoryStorage, "url", side_effect=AssertionError("No public URL")):
            data = _signature_data(self.issuer.signature_image)
        image = Image.open(BytesIO(b64decode(data.split(",", 1)[1])))
        self.assertLess(image.width, 400)
        self.assertLess(image.height, 100)
        self.assertGreater(image.width / image.height, 3)

    def test_report_expert_and_actual_issuer_are_used(self):
        unrelated = make_user(role="ceo")
        self.store_signature(unrelated, "green")
        self.store_signature(self.expert, "blue", transparent=True)
        self.store_signature(self.issuer, "red")
        context = _build_context(self.request, self.issuer)
        self.assertEqual(context["expert_signature_url"], _signature_data(self.expert.signature_image))
        self.assertEqual(context["ceo_signature_url"], _signature_data(self.issuer.signature_image))
        self.assertNotEqual(context["ceo_signature_url"], _signature_data(unrelated.signature_image))

    def test_missing_or_invalid_registered_signature_stops_issuance(self):
        make_payment(self.request, FinancialRecord.Stage.STAGE_2, approved=True)
        self.issuer.signature_image.name = "signatures/missing.png"
        self.issuer.save(update_fields=["signature_image"])
        response = self.client.post(reverse(
            "requests:ceo-certificate-requests-issue-certificate", args=[self.request.pk],
        ), {})
        self.assertEqual(response.status_code, 400)
        self.assertIn("امضا", response.json()["detail"])
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, InspectionRequest.Status.UNDER_REVIEW)
        self.assertIsNone(self.request.certificate_issued_at)

    def test_blank_registered_signature_is_rejected(self):
        output = BytesIO()
        Image.new("RGB", (50, 50), "white").save(output, format="PNG")
        self.issuer.signature_image.save("blank.png", ContentFile(output.getvalue()))
        with self.assertRaises(CertificateSignatureError):
            _signature_data(self.issuer.signature_image)

    def test_pdf_embeds_both_signatures_in_correct_columns(self):
        import fitz

        self.store_signature(self.expert, "blue", transparent=True)
        self.store_signature(self.issuer, "red")
        context = _build_context(self.request, self.issuer)
        document = fitz.open(stream=generate_certificate_pdf(self.request, self.issuer), filetype="pdf")
        self.assertEqual(len(document), 1)
        page = document[0]
        signature_rectangles = []
        for key in ("expert_signature_url", "ceo_signature_url"):
            expected = fitz.Pixmap(b64decode(context[key].split(",", 1)[1]))
            matching = [image for image in page.get_images(full=True)
                        if image[2:4] == (expected.width, expected.height)]
            rectangles = [rectangle for image in matching for rectangle in page.get_image_rects(image[0])]
            signature_rectangles.append(rectangles)
        self.assertTrue(signature_rectangles[0])
        self.assertTrue(signature_rectangles[1])
        rectangles = {tuple(rectangle) for group in signature_rectangles for rectangle in group}
        self.assertEqual(len(rectangles), 2)
        for rectangle in rectangles:
            self.assertLess(rectangle[3], page.rect.height - 110)
            self.assertLess(rectangle[2] - rectangle[0], 160)
        ordered = sorted(rectangles)
        self.assertLess(ordered[0][2], page.rect.width / 2)
        self.assertGreater(ordered[1][0], page.rect.width / 2)
