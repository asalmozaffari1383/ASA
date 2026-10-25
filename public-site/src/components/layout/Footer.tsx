import { Link } from "react-router-dom";
import { ContactButton } from "./ContactButton";
import { BrandLogo } from "../ui/BrandLogo";

export function Footer() {
  return (
    <footer id="contact" className="brand-footer bg-carbon px-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-2"><BrandLogo /></span>
              <span className="font-display text-xl font-bold">ایمن سازان آرارات<span className="mt-1 block text-xs font-normal text-white/50">مهندسی، بازرسی و ایمنی کار</span></span>
            </Link>
            <p className="mt-6 max-w-sm description-copy text-white/95">همراه شما در ارزیابی فنی، شناخت ریسک و ساختن محیط کاری ایمن‌تر؛ از ثبت درخواست تا دریافت گزارش بازرسی.</p>
          </div>
          <nav aria-label="ارتباط با آسا" className="flex flex-col items-start justify-center gap-5 text-sm text-white/70">
            <ContactButton className="font-bold text-white transition hover:text-accent">تماس با ما</ContactButton>
            <Link to="/track" className="transition hover:text-accent">پیگیری درخواست</Link>
            <a href="https://ble.ir/AsaengBot" target="_blank" rel="noopener noreferrer" className="transition hover:text-accent">ارتباط با کارشناسان در بله</a>
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs leading-6 text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ایمن سازان آرارات (آسا). تمامی حقوق محفوظ است.</p>
          <p dir="ltr" className="font-data tracking-widest">ASA · SAFETY ENGINEERING</p>
        </div>
      </div>
    </footer>
  );
}
