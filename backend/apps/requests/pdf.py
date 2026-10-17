from base64 import b64encode
from functools import lru_cache
from pathlib import Path

from django.template.loader import render_to_string
from django.utils import timezone


_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def _display(value):
    return str(value).translate(_DIGITS) if value not in (None, "") else "ثبت نشده"


def _tri_state(value):
    if value is True:
        return "دارد"
    if value is False:
        return "ندارد"
    return "اعلام نشده"


def _jalali_date(value):
    if value is None:
        return "ثبت نشده"
    year, month, day = value.year, value.month, value.day
    elapsed_months = (0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
    adjusted_year = year + 1 if month > 2 else year
    days = (
        355666 + 365 * year + (adjusted_year + 3) // 4
        - (adjusted_year + 99) // 100 + (adjusted_year + 399) // 400
        + day + elapsed_months[month - 1]
    )
    jalali_year = -1595 + 33 * (days // 12053)
    days %= 12053
    jalali_year += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jalali_year += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jalali_month, jalali_day = 1 + days // 31, 1 + days % 31
    else:
        jalali_month, jalali_day = 7 + (days - 186) // 30, 1 + (days - 186) % 30
    return _display(f"{jalali_year:04d}/{jalali_month:02d}/{jalali_day:02d}")


@lru_cache(maxsize=1)
def _document_assets():
    directory = Path(__file__).with_name("assets")
    assets = {}
    for key, filename, mime in [
        ("regular_font", "Vazirmatn-Regular.ttf", "font/ttf"),
        ("bold_font", "Vazirmatn-Bold.ttf", "font/ttf"),
        ("logo", "asa-logo.svg", "image/svg+xml"),
    ]:
        assets[key] = f"data:{mime};base64,{b64encode((directory / filename).read_bytes()).decode('ascii')}"
    return assets


def _build_context(req):
    generated = timezone.localtime()
    sections = [
        {
            "number": "۰۱", "title": "مشخصات متقاضی",
            "rows": [
                [("نام شرکت / مجموعه", _display(req.company_name)), ("نوع فعالیت", _display(req.activity_type))],
                [("نام مدیرعامل", _display(req.ceo_name)), ("موبایل مدیرعامل", _display(req.ceo_phone))],
                [("شماره تماس پشتیبان", _display(req.backup_phone)), ("نام معرف", _display(req.referrer_name))],
            ],
        },
        {
            "number": "۰۲", "title": "مشخصات محل و نوع درخواست",
            "address": _display(req.address),
            "rows": [
                [("کد پستی", _display(req.postal_code)), ("نوع مالکیت", req.get_ownership_type_display() if req.ownership_type else "ثبت نشده")],
                [("مساحت زمین (متر مربع)", _display(req.total_area_land)), ("مساحت بنا (متر مربع)", _display(req.total_area_building))],
                [("نوع بازرسی", req.get_inspection_type_display() if req.inspection_type else "ثبت نشده"), ("سال اجرای ارتینگ", _display(req.earthing_year))],
            ],
        },
    ]
    systems = [
        {"label": "سیستم اطفاء حریق", "status": _tri_state(req.has_fire_extinguisher_system)},
        {"label": "سیستم اعلام حریق", "status": _tri_state(req.has_fire_alarm_system)},
        {"label": "سیستم اتصال به زمین (ارتینگ)", "status": _tri_state(req.has_earthing_system)},
    ]
    notes = [
        {"label": label, "value": _display(value)}
        for label, value in [
            ("توضیحات سیستم اطفاء حریق", req.fire_extinguisher_details),
            ("توضیحات سیستم اعلام حریق", req.fire_alarm_details),
        ]
        if value and value.strip()
    ]
    attachments = [
        {"label": label, "status": "بارگذاری شده" if attached else "بارگذاری نشده"}
        for label, attached in [
            ("سند مالکیت", bool(req.deed_file)),
            ("اجاره‌نامه", bool(req.lease_file)),
            ("تأیید کد پستی", bool(req.postal_code_document)),
        ]
    ]
    if req.source == "bale":
        attachments.append({"label": "تصویر فرم ارسالی بله", "status": "بارگذاری شده" if req.bale_form_photo else "بارگذاری نشده"})
    return {
        "req": req, "sections": sections, "systems": systems, "notes": notes,
        "attachments": attachments, "assets": _document_assets(),
        "request_date": _jalali_date(req.request_date),
        "generated_date": _jalali_date(generated.date()),
        "generated_time": _display(generated.strftime("%H:%M")),
    }


def render_bale_form_html(req):
    return render_to_string("requests/bale_form.html", _build_context(req))


def generate_bale_form_pdf(req):
    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration

    return HTML(string=render_bale_form_html(req)).write_pdf(font_config=FontConfiguration())
