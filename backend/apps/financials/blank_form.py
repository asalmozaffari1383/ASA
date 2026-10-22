from functools import lru_cache
from html import escape
from pathlib import Path

import pymupdf


def generate_application_form(configuration):
    return _render_form(
        str(configuration.stage_1_amount), configuration.ceo_card_number,
        configuration.ceo_account_number, configuration.ceo_iban,
        configuration.ceo_account_holder,
    )


@lru_cache(maxsize=16)
def _render_form(amount, card, account, iban, holder):
    from weasyprint import HTML

    assets = Path(__file__).with_name("assets")
    font_directory = Path(__file__).parents[1] / "requests" / "assets"
    payment = "مبلغ و حساب مقصد پس از تأیید شرکت اعلام می‌شود."
    destinations = [("شماره شبا", iban), ("شماره کارت", card), ("شماره حساب", account)]
    destination = next(((label, value) for label, value in destinations if value), None)
    if int(amount) > 0 and destination and holder:
        label, value = destination
        payment = (
            f"۱- فیش پیش‌پرداخت به مبلغ {format(int(amount), ',').translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))} ریال؛ {label}: "
            f'<bdi dir="ltr">{escape(value)}</bdi></p><p>'
            f"به نام: {escape(holder)}"
        )
    css = f"""
        @page {{ size: 500pt 25.5pt; margin: 0; }}
        @font-face {{ font-family: ASA; src: url('{(font_directory / 'Vazirmatn-Regular.ttf').as_uri()}'); }}
        body {{ font-family: ASA; font-size: 8pt; line-height: 1.3; margin: 0; direction: rtl; }}
        p {{ text-align: right; margin: 0; }}
    """
    rendered = HTML(string=f'<html lang="fa" dir="rtl"><meta charset="utf-8"><style>{css}</style><body><p>{payment}</p></body></html>').write_pdf()
    with pymupdf.open(assets / "application_form.pdf") as document:
        page = document[0]
        rectangle = pymupdf.Rect(52, 594.5, 552, 620)
        page.add_redact_annot(rectangle, fill=(1, 1, 1))
        page.apply_redactions(images=0, graphics=0)
        with pymupdf.open(stream=rendered, filetype="pdf") as overlay:
            if len(overlay) != 1:
                raise ValueError("Payment information does not fit the application form")
            page.show_pdf_page(rectangle, overlay, 0)
        return document.tobytes(garbage=4, deflate=True)
