"""File upload validators (Part 5 §1 — File Security).

Browsers send a client-supplied ``Content-Type`` that is trivial to spoof, and a
filename extension proves nothing about the bytes on disk. To actually constrain
uploads to PDF / JPEG / PNG we read the leading bytes of every upload and ask
``libmagic`` (via ``python-magic``) what the content *really* is, then enforce a
size ceiling.

The validators are ``@deconstructible`` so Django can serialise the module-level
instances into migrations without spurious diffs.
"""

import magic
from django.core.exceptions import ValidationError
from django.template.defaultfilters import filesizeformat
from django.utils.deconstruct import deconstructible
from django.utils.translation import gettext_lazy as _

# 1 mebibyte. Limits below match Part 5 §1: 5MB receipts, 10MB documents.
MB = 1024 * 1024
RECEIPT_MAX_SIZE = 5 * MB
DOCUMENT_MAX_SIZE = 10 * MB
IMAGE_MAX_SIZE = 5 * MB

# Real MIME types we accept, grouped by purpose.
PDF_MIME = "application/pdf"
JPEG_MIME = "image/jpeg"
PNG_MIME = "image/png"

IMAGE_MIMETYPES = (JPEG_MIME, PNG_MIME)
DOCUMENT_MIMETYPES = (PDF_MIME, JPEG_MIME, PNG_MIME)

# How many leading bytes to sniff. The magic numbers for PDF/JPEG/PNG sit in the
# first handful of bytes; 2KB is comfortably enough for libmagic.
_SNIFF_BYTES = 2048


@deconstructible
class FileValidator:
    """Validate an uploaded file's real MIME type and size.

    Parameters
    ----------
    allowed_mimetypes:
        Iterable of MIME strings the content is allowed to be (as reported by
        libmagic, *not* the client-supplied header).
    max_size:
        Maximum allowed size in bytes.
    """

    def __init__(self, allowed_mimetypes, max_size):
        self.allowed_mimetypes = tuple(allowed_mimetypes)
        self.max_size = max_size

    def __call__(self, file):
        self._validate_size(file)
        self._validate_mimetype(file)

    def _validate_size(self, file):
        if file.size > self.max_size:
            raise ValidationError(
                _("حجم فایل (%(size)s) بیش از حد مجاز (%(limit)s) است."),
                code="file_too_large",
                params={
                    "size": filesizeformat(file.size),
                    "limit": filesizeformat(self.max_size),
                },
            )

    def _validate_mimetype(self, file):
        # Read the first bytes for sniffing, then rewind so the storage backend
        # still writes the complete file.
        position = file.tell() if hasattr(file, "tell") else 0
        file.seek(0)
        head = file.read(_SNIFF_BYTES)
        file.seek(position)

        detected = magic.from_buffer(head, mime=True)
        if detected not in self.allowed_mimetypes:
            raise ValidationError(
                _("نوع فایل مجاز نیست. تنها فرمت‌های PDF، JPEG و PNG پذیرفته می‌شوند."),
                code="invalid_mimetype",
                params={"detected": detected},
            )

    def __eq__(self, other):
        return (
            isinstance(other, FileValidator)
            and self.allowed_mimetypes == other.allowed_mimetypes
            and self.max_size == other.max_size
        )

    def __hash__(self):
        return hash((self.allowed_mimetypes, self.max_size))


# --- Ready-to-use instances, attached to model fields in each app -----------
# Financial receipts: an image of a bank slip, capped at 5MB.
validate_receipt_image = FileValidator(IMAGE_MIMETYPES, RECEIPT_MAX_SIZE)

# Inspection / fix / signature images: photos or transparent PNGs, capped at 5MB.
validate_image = FileValidator(IMAGE_MIMETYPES, IMAGE_MAX_SIZE)

# Ownership documents (deed / lease): may be a scanned PDF or a photo, 10MB.
validate_document = FileValidator(DOCUMENT_MIMETYPES, DOCUMENT_MAX_SIZE)

# Bale hand-filled form photo: an image, but documents-sized headroom (10MB).
validate_form_photo = FileValidator(IMAGE_MIMETYPES, DOCUMENT_MAX_SIZE)
