import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import type { PublicService } from "../../types/website";
import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

export function ServicesSection() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    apiClient.get<PublicService[]>("/public/services/", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setServices(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  if (!loading && !error && services.length === 0) return null;

  return (
    <section id="services" className="brand-surface px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="تخصص ما، اطمینان شما" title="ایمنی، در تمام جزئیات" align="start" />
          <p className="max-w-md description-copy text-ink">راهکارهای تخصصی برای شناخت ریسک، حفاظت از سرمایه و ساختن محیط کاری که به آن اطمینان دارید.</p>
        </AnimatedSection>
        {error ? (
          <div role="alert" className="mt-10 rounded-2xl border border-ink/10 bg-white p-8 text-sm text-steel-dark">
            دریافت خدمات ممکن نشد.
            <button type="button" className="mr-3 font-bold text-ink underline" onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
            {loading ? Array.from({ length: 3 }, (_, index) => (
              <div key={index} role="status" className="h-[480px] animate-pulse rounded-xl border border-ink/5 bg-white"><span className="sr-only">در حال دریافت خدمات</span></div>
            )) : services.map((service, index) => (
              <AnimatedSection key={service.id} delay={Math.min(index * 0.08, 0.3)} className="service-card brand-card group overflow-hidden rounded-2xl border border-accent/25 bg-white transition duration-300 hover:-translate-y-1 hover:border-accent-dark/35 hover:shadow-card">
                <Link to={`/services/${service.id}`} aria-label={`معرفی و جزئیات ${service.title}`} className="flex h-full flex-col">
                  <div className="relative overflow-hidden border-b-4 border-accent bg-accent-soft">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.image_alt || service.title} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : <div className="grid aspect-[4/3] place-items-center font-display text-3xl text-accent-dark">آسا</div>}
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                    <h3 className="font-display text-lg font-bold leading-8 text-ink">{service.title}</h3>
                    <p className="mt-3 description-copy text-ink">{service.description}</p>
                    <ul className="mb-6 mt-5 flex flex-wrap gap-2">{service.specs.map((spec, specIndex) => <li key={specIndex} className="rounded-md bg-accent-soft px-2.5 py-1.5 text-xs font-bold text-accent-dark">{spec}</li>)}</ul>
                    <span className="mt-auto flex items-center justify-between gap-3 border-t border-accent/25 pt-5 text-sm font-bold text-accent-dark">
                      <span>معرفی و جزئیات خدمت</span>
                    </span>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
