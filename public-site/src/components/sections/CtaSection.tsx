import { usePageContent } from "../../services/pageContent";
import { AnimatedSection } from "../ui/AnimatedSection";

// The emotional peak of the page: a firefighter's hand reaching through
// smoke. Dark, quiet, one message, one action.
export function CtaSection() {
  const { content: text, cta_image_url } = usePageContent();
  return (
    <section className="relative overflow-hidden bg-graphite">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-full bg-cover bg-center opacity-45 lg:w-[52%] lg:opacity-80"
        style={{ backgroundImage: `url(${JSON.stringify(cta_image_url)})` }}
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
            {text.cta_eyebrow}
          </p>
          <h2 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block leading-[1.25]">{text.cta_title}</span>
            <span className="block leading-[1.25] text-accent">{text.cta_subtitle}</span>
          </h2>
          <p className="mt-6 max-w-lg whitespace-pre-line description-copy text-white/95">
            {text.cta_description}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
