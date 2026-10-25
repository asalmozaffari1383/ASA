import { usePageContent } from "../../services/pageContent";



import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

// The request-to-certificate path. A real sequence, so the oversized numerals
// carry information — this is the one place ordering is the content.
export function ProcessSection() {
  const { content: text } = usePageContent();
  return (
    <section id="process" className="border-b border-ink/10 bg-paper px-5 py-24 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={text.process_eyebrow}
            title={text.process_title}
            align="start"
          />
          <p className="max-w-sm whitespace-pre-line description-copy text-ink lg:pb-2">
            {text.process_description}
          </p>
        </AnimatedSection>

        <ol className="mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-4 md:gap-8">
          {text.workflow_steps.map((step, index) => (
            <li key={step.title} className="list-none">
              <AnimatedSection
                delay={0.1 + index * 0.12}
                className="brand-card group relative h-full rounded-2xl border border-accent/25 border-t-4 border-t-accent bg-mist p-6 transition-colors duration-300 hover:border-accent-dark/50"
              >
                <span className="font-heavy text-5xl leading-none tracking-tight text-accent-dark transition-colors duration-300 group-hover:text-ink sm:text-6xl">
                  {(index + 1).toLocaleString("fa-IR").padStart(2, "۰")}
                </span>
                <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 whitespace-pre-line description-copy text-ink">
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
