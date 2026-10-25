import { usePageContent } from "../../services/pageContent";
import { motion, useReducedMotion } from "framer-motion";

export function HeroSection() {
  const { content: text, hero_image_url } = usePageContent();
  const reducedMotion = useReducedMotion();
  const reveal = (delay: number) => ({
    initial: reducedMotion ? false as const : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: reducedMotion ? 0 : delay },
  });

  return (
    <section id="home" aria-labelledby="hero-title" className="relative isolate bg-ink-deep pt-28 sm:pt-40">
      <div className="relative overflow-hidden">
        <motion.img
          src={hero_image_url}
          alt={text.hero_image_alt}
          fetchPriority="high"
          decoding="async"
          initial={reducedMotion ? false : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 9, ease: "easeOut" }}
          className="absolute inset-0 h-full w-full object-cover object-[58%_center] sm:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,48,0.12),rgba(10,28,48,0.08)_40%,rgba(10,28,48,0.38))]" />
        <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[max(680px,calc(100svh-160px))] sm:px-8 sm:py-24">
          <motion.p {...reveal(0.15)} className="mb-5 bg-ink-deep/85 px-5 py-1.5 text-base font-bold text-white sm:text-lg">
            {text.hero_eyebrow}
          </motion.p>
          <motion.div {...reveal(0.3)} className="relative max-w-full overflow-hidden border-b-4 border-accent bg-ink-deep/80 px-5 py-4 sm:px-12 sm:py-5">
            <h1 id="hero-title" className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-bold leading-[1.5] text-white">
              {text.hero_title}
            </h1>
            {!reducedMotion && <motion.span aria-hidden="true" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 0.85, delay: 0.45, ease: [0.76, 0, 0.24, 1] }} className="pointer-events-none absolute inset-0 origin-left bg-accent-dark" />}
          </motion.div>
          <motion.p {...reveal(0.8)} className="mt-3 max-w-full bg-ink-deep/90 px-5 py-2 text-xl font-bold leading-[1.7] text-white sm:px-8 sm:text-3xl">
            {text.hero_subtitle}
          </motion.p>
          <motion.div {...reveal(1.1)} className="relative mt-6 w-full max-w-3xl overflow-hidden bg-white/95 px-5 py-4 shadow-card sm:px-8 sm:py-5">
            <p className="whitespace-pre-line description-copy text-ink">
              {text.hero_description}
            </p>
            {!reducedMotion && <motion.span aria-hidden="true" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 0.9, delay: 1.2, ease: [0.76, 0, 0.24, 1] }} className="pointer-events-none absolute inset-0 origin-left bg-accent" />}
          </motion.div>
          <motion.a {...reveal(1.65)} href="#services" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-md border border-white/70 bg-ink-deep/85 px-8 py-1.5 text-base font-bold text-white transition-colors hover:bg-accent-dark focus-visible:bg-accent-dark">
            {text.hero_button}
          </motion.a>
        </div>
      </div>
    </section>
  );
}
