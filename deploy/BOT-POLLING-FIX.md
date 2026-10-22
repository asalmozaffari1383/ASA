# نصب رفع تکرار پیام بات

در ترمینال **مک**:

```bash
scp /tmp/asa-bot-polling-fix.tar.gz asauser@89.44.240.98:/home/asauser/
ssh asauser@89.44.240.98
```

سپس در ترمینال **سرور**:

```bash
mkdir -p /home/asauser/asa-bot-polling-fix
cd /home/asauser/asa-bot-polling-fix
tar -xzf /home/asauser/asa-bot-polling-fix.tar.gz
sudo env ASA_PIP_INDEX_URL=https://mirror-pypi.runflare.com/simple python3 install.py
```

رمز SSH و sudo، رمز `asauser` سرور است. بسته فقط فایل‌های مربوط به بات و
overlay بات را عوض می‌کند. ابتدا از فایل‌های قبلی در
`/var/backups/asa-bot-polling/` پشتیبان می‌گیرد. توکن و `.env`، دیتابیس، پنل و
Nginx تغییر نمی‌کنند. بات ری‌استارت می‌شود؛ کاربران وسط مراحل باید `/start`
بفرستند. در پایان باید `Polling fix installed` نمایش داده شود.

برای تست، در بات `/start` بفرستید، «راهنما» را بزنید و چند دقیقه صبر کنید؛ بدون
پیام جدید نباید پاسخ دیگری برسد. دوباره «راهنما» را بزنید تا مطمئن شوید پیام
جدید با همان متن همچنان جواب می‌گیرد.

برای تست ماندگاری بعد از تعویض کانتینر، پس از تست بالا داخل سرور اجرا کنید:

```bash
cd /opt/asa
sudo docker compose -f docker-compose.prod.yml -f docker-compose.bale.yml --profile bot up -d --no-deps --force-recreate bot
```

بعد از بالا آمدن بات، نباید آخرین پاسخ کامل‌شده را دوباره دریافت کنید.
حجم `bot_state` را حذف نکنید و `down -v` نزنید؛ شمارهٔ پیام پردازش‌شده آنجا ذخیره
می‌شود. برنامه پیام‌های جدید را با offset بعدی تأیید می‌کند و پس از قطع موقت
شبکه با همان offset ادامه می‌دهد.

در نخستین نصب روی نسخهٔ قدیمی، هنوز سابقهٔ پردازش ذخیره نشده است؛ ممکن است
آخرین پیام معلق قدیمی یک بار دریافت شود. پیام‌های معلق مشتری‌ها عمداً دور
ریخته نمی‌شوند. توقف ناگهانی دقیقاً بین ارسال پاسخ و ذخیرهٔ شمارهٔ پیام هم
همچنان می‌تواند باعث تکرار شود؛ این اصلاح تضمین تحویل دقیقاً یک‌باره نیست.
