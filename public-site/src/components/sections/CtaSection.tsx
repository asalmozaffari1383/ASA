import { AnimatedSection } from "../ui/AnimatedSection";

// The emotional peak of the page: a firefighter's hand reaching through
// smoke. Dark, quiet, one message, one action.
export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-graphite">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full bg-cover bg-center opacity-45 lg:w-[52%] lg:opacity-80"
        style={{ backgroundImage: "url('/images/cta-firefighter.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-l from-graphite via-graphite/85 to-graphite/20"
      />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-accent-dark via-accent to-accent-soft" />

      <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <AnimatedSection className="max-w-2xl">
          <p className="inline-flex items-center gap-2.5 text-xs font-bold tracking-[0.22em] text-white/60 sm:text-sm">
            <span className="h-2 w-2 bg-accent" aria-hidden="true" />
            پیشگیری، ارزان‌ترین تصمیم است
          </p>
          <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block leading-[1.25]">پیش از حادثه</span>
            <span className="block leading-[1.25] text-accent">اقدام کنید</span>
          </h2>
          <p className="mt-6 max-w-lg description-copy text-white/95">
            درخواست بازرسی امروز ثبت می‌شود؛ گزارش رسمی و گواهی ایمنی معتبر،
            پیش از آن‌که به آن نیاز پیدا کنید آماده است.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
