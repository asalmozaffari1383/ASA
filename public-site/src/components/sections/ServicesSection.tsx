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
    <section id="services" className="bg-mist px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <AnimatedSection className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow="تخصص ما، اطمینان شما" title="ایمنی، در تمام جزئیات" align="start" />
          <p className="max-w-md text-sm leading-8 text-steel-dark">راهکارهای تخصصی برای شناخت ریسک، حفاظت از سرمایه و ساختن محیط کاری که به آن اطمینان دارید.</p>
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
              <AnimatedSection key={service.id} delay={Math.min(index * 0.08, 0.3)} className="service-card group overflow-hidden rounded-xl border border-ink/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card">
                <Link to={`/services/${service.id}`} aria-label={`معرفی و جزئیات ${service.title}`} className="flex h-full flex-col">
                  <div className="relative overflow-hidden bg-accent-soft">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.image_alt || service.title} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : <div className="grid aspect-[4/3] place-items-center font-display text-3xl text-accent-dark">آسا</div>}
                    <span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/95 font-data text-xs text-ink" aria-hidden="true">{(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                    <h3 className="font-display text-lg font-bold leading-8 text-ink">{service.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-steel-dark">{service.description}</p>
                    <ul className="mb-6 mt-5 flex flex-wrap gap-2">{service.specs.map((spec, specIndex) => <li key={specIndex} className="rounded-md bg-mist px-2.5 py-1.5 text-[10px] font-medium text-steel-dark">{spec}</li>)}</ul>
                    <span className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-5 text-sm font-bold text-ink">
                      <span>معرفی و جزئیات خدمت</span>
                      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full border border-ink/10 transition group-hover:border-ink group-hover:bg-ink group-hover:text-white">←</span>
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
