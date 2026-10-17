import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="home" aria-labelledby="hero-title" className="relative isolate bg-ink-deep pt-20 sm:pt-28">
      <div className="relative overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="بازرسی تخصصی تجهیزات صنعتی توسط کارشناس ایمنی آسا"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[35%_center] sm:object-left"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(270deg,rgba(10,28,48,0.98)_0%,rgba(10,28,48,0.88)_32%,rgba(10,28,48,0.45)_62%,rgba(10,28,48,0.12)_100%)] max-sm:bg-[linear-gradient(180deg,rgba(10,28,48,0.9),rgba(10,28,48,0.82))]" />
        <div className="relative mx-auto flex min-h-[580px] max-w-7xl items-center px-5 py-14 sm:min-h-[620px] sm:px-8 lg:min-h-[660px] lg:py-20">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-xl text-white"
          >
            <p className="mb-7 flex items-center gap-3 text-xs font-medium text-white/75 sm:text-sm">
              <span aria-hidden="true" className="h-px w-9 bg-accent" />
              مهندسی، بازرسی و ایمنی کار
            </p>
            <h1 id="hero-title" className="font-display text-3xl font-extrabold leading-[1.75] sm:text-[2.75rem] sm:leading-[1.65] lg:text-5xl lg:leading-[1.65]">
              ایمن سازان آرارات
              <span className="mt-2 block text-2xl font-medium text-white/85 sm:text-3xl">دقت در بازرسی،<br className="sm:hidden" /> اطمینان در ایمنی.</span>
            </h1>
            <p className="mt-7 max-w-lg text-sm leading-8 text-white/75 sm:text-base sm:leading-9">
              از ارزیابی فنی تجهیزات تا طراحی راهکارهای ایمنی؛ همراه صنایع و کارگاه‌ها برای شناخت ریسک، حفاظت از سرمایه و ساختن محیط کاری ایمن‌تر.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/request-certificate" className="inline-flex min-h-12 items-center justify-center gap-7 rounded-md bg-white px-6 text-sm font-bold text-ink transition hover:bg-accent-soft">
                ثبت درخواست بازرسی <span aria-hidden="true">↖</span>
              </Link>
              <a href="#services" className="inline-flex min-h-12 items-center justify-center gap-5 rounded-md border border-white/35 px-6 text-sm font-medium text-white transition hover:border-white hover:bg-white/10">
                خدمات تخصصی <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/20 pt-6 text-xs text-white/75">
              {["بازرسی تخصصی", "گزارش مستند", "پیگیری آنلاین"].map((text) => (
                <span key={text} className="flex items-center gap-2">
                  <span className="text-accent" aria-hidden="true">✓</span>{text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
        <div aria-hidden="true" className="absolute bottom-8 left-8 hidden items-center gap-3 text-[10px] tracking-[0.2em] text-white/80 lg:flex" dir="ltr">
          <span className="h-px w-12 bg-white/50" /> ASA / TECHNICAL INSPECTION
        </div>
      </div>
    </section>
  );
}
