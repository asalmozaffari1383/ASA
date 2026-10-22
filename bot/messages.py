"""Persian message strings + phone normalization."""

from . import config

# --- Menu option labels (also matched on incoming text) ---------------------
BTN_NEW_REQUEST = "📝 ثبت درخواست بازرسی"
BTN_ABOUT = "ℹ️ درباره ما"
BTN_CONTACT = "📞 تماس با ما"
BTN_HELP = "❓ راهنما"
BTN_SHARE_CONTACT = "📱 ارسال شماره تماس من"

WELCOME = (
    "به ربات مشاوران ایمنی آسا خوش آمدید! 🛡\n\n"
    "برای ثبت درخواست بازرسی ایمنی، یکی از گزینه‌های زیر را انتخاب کنید."
)

ABOUT = (
    "شرکت مشاوران ایمنی آسا، ارائه‌دهنده خدمات بازرسی ایمنی و آتش‌نشانی و صدور "
    "گواهی‌نامه‌های معتبر است."
)

CONTACT = f"برای ارتباط با شرکت، بخش تماس با ما در سایت را ببینید:\n{config.PUBLIC_SITE_URL}/#contact"

HELP = (
    "برای ثبت درخواست، گزینه «ثبت درخواست بازرسی» را انتخاب کنید، سپس به‌ترتیب:\n"
    "۱) شماره تماس\n۲) تصویر فرم تکمیل‌شده\n۳) تصویر رسید پرداخت\n"
    "را ارسال نمایید. کد رهگیری در پایان به شما داده می‌شود."
)


def start_payment_text(payment) -> str:
    destinations = "\n".join(
        f"{label}: {value}" for label, value in [
            ("شماره کارت", payment.card_number), ("شماره حساب", payment.account_number),
            ("شماره شبا", payment.iban),
        ] if value
    )
    return (
        f"لطفاً مبلغ پیش‌پرداخت {payment.amount:,.0f} ریال را به حساب زیر واریز کنید:\n\n"
        f"{destinations}\nبه نام: {payment.account_holder}\n\n"
        "فرم خام درخواست را دریافت، چاپ و تکمیل نمایید."
    )


ASK_PHONE = (
    "برای ادامه، شماره موبایل خود را با دکمه زیر به اشتراک بگذارید\n"
    "یا آن را به‌صورت دستی (مثال: 09123456789) ارسال کنید."
)
INVALID_PHONE = "شماره موبایل نامعتبر است. لطفاً شماره‌ای با فرمت 09xxxxxxxxx ارسال کنید."
ASK_FORM_PHOTO = "✅ شماره ثبت شد.\n\nاکنون «تصویر» واضح از فرم تکمیل‌شده را ارسال کنید (فرمت JPG یا PNG)."
NEED_IMAGE = (
    "لطفاً یک «تصویر» (عکس) ارسال کنید.\n"
    "فایل‌های PDF یا سایر فرمت‌ها پذیرفته نمی‌شوند؛ از فرم/رسید عکس بگیرید و ارسال کنید."
)
ASK_RECEIPT_PHOTO = "✅ فرم دریافت شد.\n\nاکنون «تصویر» رسید پرداخت پیش‌پرداخت را ارسال کنید (فرمت JPG یا PNG)."
PROCESSING = "در حال ثبت درخواست شما... ⏳"
GENERIC_ERROR = "مشکلی پیش آمده است، لطفاً مجدداً تلاش کنید."
API_ERROR = "ثبت درخواست در سامانه با خطا مواجه شد. لطفاً کمی بعد دوباره تلاش کنید."
PAYMENT_UNAVAILABLE = "اطلاعات پرداخت در حال حاضر آماده نیست. لطفاً کمی بعد دوباره تلاش کنید یا از طریق سایت با شرکت تماس بگیرید."
INVALID_SUBMISSION = (
    "اطلاعات یا تصاویر ارسالی نامعتبر است. لطفاً مطمئن شوید تصاویر فرم و رسید با "
    "فرمت JPG یا PNG و واضح هستند، سپس دوباره تصویر رسید را ارسال کنید."
)
USE_MENU = "لطفاً از منوی زیر یک گزینه را انتخاب کنید."


def success_text(tracking_code: str) -> str:
    return (
        "🎉 تبریک! درخواست شما با موفقیت ثبت شد.\n\n"
        f"کد رهگیری شما:\n\n🔖 *{tracking_code}*\n\n"
        "این کد را برای پیگیری وضعیت درخواست نزد خود نگه دارید."
    )


def normalize_phone(raw: str) -> str:
    """Coerce to canonical ``09xxxxxxxxx``; return '' if not a valid IR mobile."""
    raw = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    digits = "".join(character for character in raw if character in "0123456789")
    if digits.startswith("0098"):
        digits = digits[2:]
    if digits.startswith("98"):
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    if len(digits) == 11 and digits.startswith("09"):
        return digits
    return ""
