import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../services/apiClient";
import type { PublicService } from "../types/website";

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function ServiceDetailPage() {
  const { serviceId } = useParams();
  const [service, setService] = useState<PublicService | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"missing" | "network" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setService(null);
    setError(null);
    setLoading(true);
    if (!serviceId || !/^[1-9]\d*$/.test(serviceId)) {
      setError("missing");
      setLoading(false);
      return () => controller.abort();
    }
    apiClient.get<PublicService>(`/public/services/${serviceId}/`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setService(data); })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(isAxiosError(failure) && failure.response?.status === 404 ? "missing" : "network");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [serviceId, attempt]);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get<PublicService[]>("/public/services/", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setServices(data); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!service) return;
    const previous = document.title;
    document.title = `${service.title} | ایمن سازان آرارات`;
    return () => { document.title = previous; };
  }, [service]);

  const applications = lines(service?.applications ?? "");
  const steps = lines(service?.inspection_steps ?? "");
  const contents = [
    { id: "service-overview", label: "معرفی خدمت" },
    ...(applications.length ? [{ id: "service-applications", label: "دامنه و کاربردها" }] : []),
    ...(steps.length ? [{ id: "service-steps", label: "مراحل انجام خدمت" }] : []),
    { id: "service-request", label: "درخواست این خدمت" },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="min-h-[70vh] pt-20 sm:pt-28">
      {loading ? (
        <div role="status" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <p className="text-sm text-steel-dark">در حال دریافت اطلاعات خدمت…</p>
          <div aria-hidden="true" className="mt-8 h-64 animate-pulse rounded-xl bg-steel-light" />
        </div>
      ) : error || !service ? (
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">{error === "missing" ? "این خدمت در دسترس نیست" : "دریافت اطلاعات ممکن نشد"}</h1>
          <p role="alert" className="mt-5 text-sm leading-8 text-steel-dark">{error === "missing" ? "ممکن است این خدمت حذف یا از انتشار خارج شده باشد." : "ارتباط با سرور را بررسی کنید و دوباره تلاش کنید."}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-5">
            {error !== "missing" && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-md bg-ink px-5 py-3 text-sm font-bold text-white">تلاش دوباره</button>}
            <Link to="/#services" className="rounded-md border border-ink/20 px-5 py-3 text-sm font-bold">بازگشت به خدمات</Link>
          </div>
        </div>
      ) : (
        <>
          <header className="bg-ink-deep px-5 py-10 text-white sm:px-8 sm:py-14">
            <div className="mx-auto max-w-7xl">
              <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-3 text-xs leading-7 text-white/70">
                <Link to="/" className="hover:text-white">صفحه اصلی</Link><span aria-hidden="true">/</span>
                <Link to="/#services" className="hover:text-white">خدمات تخصصی</Link><span aria-hidden="true">/</span>
                <span aria-current="page">{service.title}</span>
              </nav>
              <h1 className="mt-6 font-display text-2xl font-bold leading-[1.7] sm:text-4xl sm:leading-[1.7]">{service.title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/75 sm:text-base">{service.description}</p>
            </div>
          </header>
          <div className="mx-auto grid max-w-7xl items-start gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
            <article className="min-w-0 overflow-hidden rounded-xl border border-ink/10 bg-white">
              {service.image_url && <img src={service.image_url} alt={service.image_alt || service.title} fetchPriority="high" className="aspect-[16/9] w-full object-cover" />}
              <div className="space-y-12 p-6 sm:p-10">
                <section id="service-overview" aria-labelledby="overview-title">
                  <p className="text-xs font-semibold text-accent-dark">خدمات تخصصی آسا</p>
                  <h2 id="overview-title" className="mt-3 font-display text-xl font-bold leading-9 sm:text-2xl">معرفی {service.title}</h2>
                  <div className="mt-5 space-y-5 text-sm leading-9 text-steel-dark sm:text-base">
                    {(service.details || service.description).split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => <p key={index} className="whitespace-pre-line break-words">{paragraph}</p>)}
                  </div>
                  {service.specs.length > 0 && <ul className="mt-7 flex flex-wrap gap-2">{service.specs.map((spec, index) => <li key={index} className="rounded-md bg-accent-soft px-3 py-2 text-xs leading-6 text-accent-dark">{spec}</li>)}</ul>}
                </section>
                {applications.length > 0 && (
                  <section id="service-applications" aria-labelledby="applications-title" className="border-t border-ink/10 pt-8">
                    <h2 id="applications-title" className="font-display text-xl font-bold leading-9 sm:text-2xl">دامنه و کاربردها</h2>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">{applications.map((item, index) => <li key={index} className="flex items-start gap-3 rounded-lg bg-mist p-4 text-sm leading-8 text-steel-dark"><span aria-hidden="true" className="text-accent-dark">✓</span><span className="min-w-0 break-words">{item}</span></li>)}</ul>
                  </section>
                )}
                {steps.length > 0 && (
                  <section id="service-steps" aria-labelledby="steps-title" className="border-t border-ink/10 pt-8">
                    <h2 id="steps-title" className="font-display text-xl font-bold leading-9 sm:text-2xl">مراحل انجام خدمت</h2>
                    <ol className="mt-6 space-y-5">{steps.map((step, index) => <li key={index} className="flex items-start gap-4"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark">{(index + 1).toLocaleString("fa-IR")}</span><p className="min-w-0 break-words pt-1 text-sm leading-8 text-steel-dark">{step}</p></li>)}</ol>
                  </section>
                )}
                <section id="service-request" aria-labelledby="request-title" className="rounded-xl bg-ink p-6 text-white sm:p-8">
                  <h2 id="request-title" className="font-display text-xl font-bold leading-9">برای بررسی پروژه‌تان آماده‌اید؟</h2>
                  <p className="mt-3 text-sm leading-8 text-white/75">اطلاعات مجموعه و نیاز خود را در فرم درخواست ثبت کنید تا محدوده خدمت و مدارک مورد نیاز بررسی شود.</p>
                  <Link to="/request-certificate" className="mt-6 inline-flex min-h-12 items-center gap-6 rounded-md bg-white px-5 text-sm font-bold text-ink">ثبت درخواست بازرسی <span aria-hidden="true">↖</span></Link>
                </section>
              </div>
            </article>
            <aside className="space-y-6 lg:sticky lg:top-36">
              <nav aria-label="فهرست مطالب خدمت" className="rounded-xl border border-ink/10 bg-white p-6">
                <p className="border-b border-ink/10 pb-4 text-base font-bold">در این صفحه می‌خوانید</p>
                <ul className="mt-3 space-y-1">{contents.map((item) => <li key={item.id}><a href={`#${item.id}`} className="block rounded-md px-3 py-3 text-sm text-steel-dark transition hover:bg-accent-soft hover:text-accent-dark">{item.label}</a></li>)}</ul>
              </nav>
              {services.some((item) => item.id !== service.id) && (
                <nav aria-label="خدمات دیگر" className="rounded-xl border border-ink/10 bg-white p-6">
                  <p className="border-b border-ink/10 pb-4 text-base font-bold">خدمات دیگر آسا</p>
                  <ul className="mt-3 space-y-1">{services.filter((item) => item.id !== service.id).map((item) => <li key={item.id}><Link to={`/services/${item.id}`} className="block rounded-md px-3 py-3 text-sm leading-7 text-steel-dark transition hover:bg-accent-soft hover:text-accent-dark">{item.title}</Link></li>)}</ul>
                </nav>
              )}
              <Link to="/#services" className="block p-2 text-center text-sm font-semibold text-accent-dark">→ بازگشت به همهٔ خدمات</Link>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
