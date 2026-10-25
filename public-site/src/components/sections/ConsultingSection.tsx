import { usePageContent } from "../../services/pageContent";
import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

export function ConsultingSection() {
  const { content: text, about_image_url } = usePageContent();
  return (
    <section id="about" className="brand-surface px-5 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        {/* Editorial text + pillar grid. */}
        <AnimatedSection>
          <SectionHeading
            eyebrow={text.about_eyebrow}
            title={text.about_title}
            align="start"
          />
          <p className="mt-6 max-w-xl whitespace-pre-line description-copy text-ink">
            {text.about_description}
          </p>
          <p className="mt-4 max-w-xl whitespace-pre-line description-copy text-ink">
            {text.about_description_extra}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {text.pillars.map((pillar, index) => (
              <div key={index} className="brand-card rounded-2xl border border-accent/25 bg-paper p-5 sm:p-6">
                <p className="font-heavy text-2xl text-accent-dark sm:text-3xl">
                  {(index + 1).toLocaleString("fa-IR").padStart(2, "۰")}
                </p>
                <p className="mt-2 font-display text-base font-bold text-ink">
                  {pillar.label}
                </p>
                <p className="mt-1 whitespace-pre-line description-copy text-ink">
                  {pillar.detail}
                </p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="relative">
          <div className="brand-photo relative overflow-hidden rounded-[2rem]">
            <img
              src={about_image_url}
              alt={text.about_image_alt}
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
