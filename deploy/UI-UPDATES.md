# بسته‌های اصلاح منو و آپلود لوگو

از ریشه پروژه روی مک، خروجی‌های production را بسازید:

```bash
VITE_API_BASE_URL=/api VITE_PUBLIC_SITE_URL=https://asaeng.org npm run build --prefix frontend
npm run build --prefix public-site
python3 deploy/build-ui-update.py menu
python3 deploy/build-ui-update.py partner-logo
```

بسته‌ها به‌ترتیب در `/tmp/asa-menu-fix.tar.gz` و `/tmp/asa-partner-logo-fix.tar.gz` ساخته می‌شوند. فایل `.env` و داده‌های کاربران وارد بسته نمی‌شوند.

بسته موردنیاز را با `scp` به `/home/asauser/` سرور منتقل، در پوشه‌ای جدا استخراج و `sudo python3 install.py` را در همان پوشه اجرا کنید. نصب‌کننده به سایت موجود در `/opt/asa` نیاز دارد و قبل از تغییر از فایل‌ها پشتیبان می‌گیرد. نصب منو فقط سایت عمومی را عوض می‌کند و به دیتابیس و فضای فایل وابسته نیست.

نصب لوگو از دیتابیس نیز پشتیبان می‌گیرد؛ تنها سرویس `web` را بازسازی و پس از تست اتصال فعال می‌کند. اگر کلید فعلی فضای فایل رد شود، Access Key و Secret Key موجود سرویس `asa-media` در پارس‌پک را به‌صورت مخفی می‌پرسد. این‌ها رمز SSH نیستند. تنظیمات جدید تنها بعد از موفقیت آپلود، خواندن و پاک‌کردن فایل آزمایشی ذخیره می‌شوند. کلیدها را در گفتگو، خروجی لاگ یا گیت قرار ندهید.

پس از موفقیت، صفحه را با `Cmd+Shift+R` تازه کنید. یک لوگوی جدید ثبت کنید و نمایش آن را در سایت عمومی بررسی کنید. موفقیت تست‌های محلی، معتبر بودن کلیدهای سرور را تأیید نمی‌کند.


## نصب مشترک مدیریت صفحه اصلی، تقویم شمسی و دکمه‌های همکاران

در مک، `python3 deploy/build-site-update.py` خروجی تولید پنل و سایت را با آدرس‌های واقعی می‌سازد و `/tmp/asa-site-update.tar.gz` را آماده می‌کند. بسته شامل سورس مربوط، migrationهای سایت و خروجی آمادهٔ هر دو رابط است؛ فایل `.env` و فایل‌های کاربران وارد بسته نمی‌شوند.

انتقال از مک:

```bash
scp /tmp/asa-site-update.tar.gz asauser@89.44.240.98:/home/asauser/
ssh asauser@89.44.240.98
```

داخل سرور:

```bash
mkdir -p /home/asauser/asa-site-update
tar -xzf /home/asauser/asa-site-update.tar.gz -C /home/asauser/asa-site-update
sudo python3 /home/asauser/asa-site-update/install.py
```

نصب‌کننده ابتدا صحت بسته و Nginx را بررسی می‌کند، سپس از فایل‌های قابل تغییر و دیتابیس در `/var/backups/asa-site-update/` نسخه پشتیبان می‌گیرد. بک‌اند را می‌سازد، migration را اجرا می‌کند و بعد از پاسخ سالم API، خروجی سایت و پنل را فعال می‌کند. `.env`، تنظیمات Nginx، ایمیل و بات را تغییر نمی‌دهد. فایل‌های قدیمی دارای هش نگه داشته می‌شوند تا تب‌های باز کار کنند. در صورت خطا نصب متوقف می‌شود و مسیر نسخه پشتیبان چاپ می‌شود؛ بازگردانی خودکار انجام نمی‌شود و نباید نسخه پشتیبان حذف شود.

پایان موفق با `UPDATE COMPLETE` مشخص می‌شود. پنل و سایت را با `Command+Shift+R` تازه کنید. مسیرهای بررسی: `/panel/ceo/site-pages` و `/panel/ceo/site-partners` در پنل، و `/request-certificate` در سایت عمومی.
