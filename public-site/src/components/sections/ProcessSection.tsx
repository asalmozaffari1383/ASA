import { workflowSteps } from "../../data/siteContent";

const stepNumerals = ["۰۱", "۰۲", "۰۳"];
import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

// The request-to-certificate path. A real sequence, so the oversized numerals
// carry information — this is the one place ordering is the content.
export function ProcessSection() {
  return (
    <section id="process" className="border-b border-ink/10 bg-paper px-5 py-24 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="فرآیند همکاری"
            title="از درخواست تا گواهی قابل استعلام"
            align="start"
          />
          <p className="max-w-sm text-sm leading-7 text-steel-dark lg:pb-2">
            مسیر تبدیل خدمات آسا به گزارش رسمی و گواهی معتبر — شفاف و قابل
            پیگیری.
          </p>
        </AnimatedSection>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {workflowSteps.map((step, index) => (
            <li key={step.title} className="list-none">
              <AnimatedSection
                delay={0.1 + index * 0.12}
                className="group relative border-t-2 border-ink/15 pt-8 transition-colors duration-300 hover:border-accent"
              >
                <span className="font-heavy text-6xl leading-none tracking-tight text-steel-light transition-colors duration-300 group-hover:text-accent sm:text-7xl">
                  {stepNumerals[index]}
                </span>
                <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-7 text-steel-dark">
                  {step.description}
                </p>
              </AnimatedSection>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
