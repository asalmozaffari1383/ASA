import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import type { CompanyPartner } from "../../types/website";
import { SectionHeading } from "../ui/SectionHeading";

export function ClientsSection() {
  const [partners, setPartners] = useState<CompanyPartner[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    apiClient.get<CompanyPartner[]>("/public/partners/", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setPartners(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!partners.length || window.location.hash !== "#clients") return;
    const frame = requestAnimationFrame(() => document.getElementById("clients")?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [partners]);

  if (!error && partners.length === 0) return null;

  return (
    <section id="clients" className="border-y border-ink/10 bg-white px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="همراهان آسا" title="شرکت‌هایی که به ما اعتماد کرده‌اند" />
        {error ? (
          <p role="status" className="mt-8 text-center text-sm leading-8 text-steel-dark">
            دریافت لوگوی همکاران ممکن نشد.
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mr-3 font-semibold text-accent-dark underline">تلاش دوباره</button>
          </p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {partners.map((partner) => (
              <li key={partner.id} className="flex min-w-0 flex-col items-center justify-center gap-4 rounded-xl border border-ink/10 bg-white px-5 py-7 transition hover:border-accent-dark/40 hover:shadow-soft">
                <img src={partner.logo_url} alt={`لوگوی ${partner.name}`} loading="lazy" decoding="async" className="h-16 w-full max-w-[160px] object-contain" />
                <p className="text-center text-xs font-medium leading-6 text-steel-dark">{partner.name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
