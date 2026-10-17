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

CONTACT = "📞 شماره تماس پشتیبانی: ۰۲۱-۱۲۳۴۵۶۷۸"

HELP = (
    "برای ثبت درخواست، گزینه «ثبت درخواست بازرسی» را انتخاب کنید، سپس به‌ترتیب:\n"
    "۱) شماره تماس\n۲) تصویر فرم تکمیل‌شده\n۳) تصویر رسید پرداخت\n"
    "را ارسال نمایید. کد رهگیری در پایان به شما داده می‌شود."
)


def start_payment_text() -> str:
    return (
        "لطفاً مبلغ پیش‌پرداخت را به شماره کارت زیر واریز کنید:\n\n"
        f"💳 {config.CEO_CARD_NUMBER}\n"
        "به نام: شرکت مشاوران ایمنی آسا\n\n"
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
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits.startswith("98"):
        digits = "0" + digits[2:]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    if len(digits) == 11 and digits.startswith("09"):
        return digits
    return ""
