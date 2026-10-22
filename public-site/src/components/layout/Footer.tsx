import { Link } from "react-router-dom";
import { navItems } from "../../data/siteContent";
import { BrandLogo } from "../ui/BrandLogo";

export function Footer() {
  return (
    <footer id="contact" className="bg-carbon px-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 py-16 md:grid-cols-[1.4fr_0.8fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-2"><BrandLogo /></span>
              <span className="font-display text-xl font-bold">ایمن سازان آرارات<span className="mt-1 block text-xs font-normal text-white/50">مهندسی، بازرسی و ایمنی کار</span></span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-8 text-white/60">همراه شما در ارزیابی فنی، شناخت ریسک و ساختن محیط کاری ایمن‌تر؛ از ثبت درخواست تا دریافت گزارش بازرسی.</p>
          </div>
          <nav aria-label="پیوندهای سریع">
            <p className="text-sm font-bold">دسترسی سریع</p>
            <ul className="mt-6 space-y-4 text-sm text-white/60">
              {navItems.map((item) => (
                <li key={item.href}><Link to={item.href === "#" ? "/" : `/${item.href}`} className="transition hover:text-accent">{item.label}</Link></li>
              ))}
              <li><Link to="/track" className="transition hover:text-accent">پیگیری درخواست</Link></li>
              <li><a href="https://ble.ir/AsaengBot" target="_blank" rel="noopener noreferrer" className="transition hover:text-accent">ثبت درخواست در پیام‌رسان بله</a></li>
            </ul>
          </nav>
          <div>
            <p className="text-sm font-bold">برای ایمنی پروژه‌تان قدم بردارید</p>
            <p className="mt-6 text-sm leading-8 text-white/60">مشخصات پروژه و خدمت مورد نیاز را ثبت کنید تا مسیر بررسی و بازرسی آغاز شود.</p>
            <Link to="/request-certificate" className="mt-6 inline-flex min-h-12 items-center gap-6 rounded-xl bg-accent px-5 text-sm font-bold text-ink transition hover:bg-white">ثبت درخواست بازرسی <span aria-hidden="true">↖</span></Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs leading-6 text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ایمن سازان آرارات (آسا). تمامی حقوق محفوظ است.</p>
          <p dir="ltr" className="font-data tracking-widest">ASA · SAFETY ENGINEERING</p>
        </div>
      </div>
    </footer>
  );
}
