"""Security tests for the python-magic file validators (Part 5 §1)."""

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from apps.common.validators import (
    DOCUMENT_MAX_SIZE,
    RECEIPT_MAX_SIZE,
    validate_document,
    validate_image,
    validate_receipt_image,
)
from .factories import PNG_BYTES


class MimeSpoofingTests(SimpleTestCase):
    def test_text_renamed_to_png_is_rejected(self):
        """A plain-text payload renamed .png (and claiming image/png) is blocked."""
        spoof = SimpleUploadedFile(
            "evil.png", b"#!/bin/sh\nrm -rf /\n", content_type="image/png"
        )
        with self.assertRaises(ValidationError) as ctx:
            validate_image(spoof)
        self.assertEqual(ctx.exception.code, "invalid_mimetype")

    def test_text_renamed_to_pdf_is_rejected(self):
        spoof = SimpleUploadedFile(
            "evil.pdf", b"just some text pretending to be a pdf", content_type="application/pdf"
        )
        with self.assertRaises(ValidationError) as ctx:
            validate_document(spoof)
        self.assertEqual(ctx.exception.code, "invalid_mimetype")

    def test_genuine_png_passes(self):
        good = SimpleUploadedFile("real.png", PNG_BYTES, content_type="image/png")
        validate_image(good)  # should not raise
        good.seek(0)
        validate_receipt_image(good)  # receipts accept images too


class SizeLimitTests(SimpleTestCase):
    def test_receipt_over_5mb_rejected(self):
        big = SimpleUploadedFile("r.png", b"\x00" * (RECEIPT_MAX_SIZE + 1), content_type="image/png")
        with self.assertRaises(ValidationError) as ctx:
            validate_receipt_image(big)
        self.assertEqual(ctx.exception.code, "file_too_large")

    def test_document_over_10mb_rejected(self):
        big = SimpleUploadedFile("d.pdf", b"\x00" * (DOCUMENT_MAX_SIZE + 1), content_type="application/pdf")
        with self.assertRaises(ValidationError) as ctx:
            validate_document(big)
        self.assertEqual(ctx.exception.code, "file_too_large")

    def test_document_under_limit_size_ok(self):
        # 1KB genuine PNG — under both size and the PDF/JPEG/PNG mime allowlist.
        ok = SimpleUploadedFile("d.png", PNG_BYTES, content_type="image/png")
        validate_document(ok)  # should not raise
