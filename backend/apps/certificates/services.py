"""Decoupled certificate (HTML -> PDF) generation engine (Part 5 §5).

The pipeline is deliberately split so it is both testable and isolated:

  render_certificate_html()  -> pure Django template rendering (no native deps)
  generate_certificate_pdf() -> WeasyPrint HTML->PDF (lazy import; native deps)
  build_certificate()        -> render, convert, persist to object storage

WeasyPrint is imported *inside* the function so importing this module (and running
the rest of the business logic / tests) never requires the Pango/Cairo native
libraries to be present.
"""

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.template.loader import render_to_string
from django.utils import timezone

from apps.inspections.services import get_flagged_defects


def _safe_url(file_field):
    """Return a file field's URL, or ``None`` if unset/unavailable."""
    if not file_field:
        return None
    try:
        return file_field.url
    except Exception:  # pragma: no cover - storage misconfig shouldn't break render
        return None


def _build_context(inspection_request, issued_by=None) -> dict:
    report = getattr(inspection_request, "report", None)
    expert = report.expert if report else None
    return {
        "req": inspection_request,
        "report": report,
        "expert": expert,
        "issued_by": issued_by,
        "issue_date": timezone.localdate(),
        # Only *raised* defects are listed on the certificate (all must be fixed
        # for issuance to be permitted, per the gating rule).
        "defects": get_flagged_defects(report) if report else [],
        "expert_signature_url": _safe_url(
            getattr(expert, "signature_image", None)
        ),
        "ceo_signature_url": _safe_url(
            getattr(issued_by, "signature_image", None)
        ),
    }


def render_certificate_html(inspection_request, issued_by=None) -> str:
    """Render the certificate HTML. No native dependencies — safe to unit test."""
    return render_to_string(
        "certificates/certificate.html",
        _build_context(inspection_request, issued_by),
    )


def generate_certificate_pdf(inspection_request, issued_by=None) -> bytes:
    """Render the certificate to PDF bytes via WeasyPrint."""
    from weasyprint import HTML  # lazy: native libs only needed at issuance time

    html = render_certificate_html(inspection_request, issued_by)
    return HTML(string=html).write_pdf()


def build_certificate(inspection_request, issued_by=None) -> str:
    """Generate, persist (to S3/local storage) and return the certificate URL."""
    pdf_bytes = generate_certificate_pdf(inspection_request, issued_by)
    path = f"certificates/{inspection_request.tracking_code}.pdf"
    saved_path = default_storage.save(path, ContentFile(pdf_bytes))
    return default_storage.url(saved_path)
