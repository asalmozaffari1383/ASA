import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

const pillars = [
  { num: "۰۱", label: "تحلیل ریسک", detail: "شناسایی و ارزیابی خطرات پیش از اجرا" },
  { num: "۰۲", label: "طراحی ایمن", detail: "راهکار مهندسی مطابق استاندارد" },
  { num: "۰۳", label: "مستندسازی دقیق", detail: "ثبت شواهد و گزارش رسمی هر بازرسی" },
  { num: "۰۴", label: "پیگیری درخواست", detail: "اطلاع از مراحل بررسی به‌صورت آنلاین" },
];

export function ConsultingSection() {
  return (
    <section id="about" className="brand-surface px-5 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        {/* Editorial text + pillar grid. */}
        <AnimatedSection>
          <SectionHeading
            eyebrow="مهندسی و مشاوره"
            title="تصمیم‌های ایمن، پیش از شروع پروژه"
            align="start"
          />
          <p className="mt-6 max-w-xl description-copy text-ink">
            طراحی، اجرا و مشاوره پیش از پروژه در زمینه سیستم‌های ارتینگ و ایمنی
            حریق.
          </p>
          <p className="mt-4 max-w-xl description-copy text-ink">
            آسا با نگاه مهندسی و مستندسازی دقیق، مسیر ارزیابی، طراحی و اخذ
            تأییدیه‌های ایمنی را برای سازمان‌ها و کارگاه‌های صنعتی ساده‌تر و
            قابل اتکاتر می‌کند.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {pillars.map((pillar) => (
              <div key={pillar.num} className="brand-card rounded-2xl border border-accent/25 bg-paper p-5 sm:p-6">
                <p className="font-heavy text-2xl text-accent-dark sm:text-3xl">
                  {pillar.num}
                </p>
                <p className="mt-2 font-display text-base font-bold text-ink">
                  {pillar.label}
                </p>
                <p className="mt-1 description-copy text-ink">
                  {pillar.detail}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="relative">
          <div className="brand-photo relative overflow-hidden rounded-[2rem]">
            <img
              src="/images/service-vessels.jpg"
              alt="کارشناس بازرسی در میان مخازن تحت فشار"
              loading="lazy"
              className="aspect-[4/3] w-full object-cover lg:aspect-[5/4]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-ink/10 mix-blend-multiply"
            />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-accent" />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
