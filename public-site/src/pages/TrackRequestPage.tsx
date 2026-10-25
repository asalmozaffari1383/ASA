import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TrackingStepper } from "../components/tracking/TrackingStepper";
import { trackRequest, uploadFinalPayment, uploadFix } from "../services/tracking";
import type { OutstandingDefect, TrackingPayload } from "../services/types";

export function TrackRequestPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      setData(await trackRequest(trimmed));
    } catch {
      setData(null);
      setError("درخواستی با این کد رهگیری یافت نشد.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-lookup when arriving from the success screen (?code=...).
  useEffect(() => {
    const initial = searchParams.get("code");
    if (initial) void lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void lookup(code);
  }

  return (
    <main id="main-content" tabIndex={-1} className="px-5 pb-24 pt-32 sm:px-6 sm:pb-28 sm:pt-44 lg:px-8 lg:pt-48">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-dark transition hover:text-ink"
          >
            <span aria-hidden="true">→</span>
            بازگشت به صفحه اصلی
          </Link>
          <span className="flex items-center justify-center gap-2.5 text-xs font-bold tracking-[0.22em] text-steel-dark">
            <span className="h-2 w-2 bg-accent" aria-hidden="true" />
            پیگیری درخواست
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink-deep sm:text-5xl">
            پیگیری وضعیت درخواست
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-steel-dark">
            کد رهگیری دریافتی هنگام ثبت درخواست را وارد کنید تا آخرین وضعیت بازرسی خود را ببینید.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="clip-notch flex flex-col gap-3 border border-ink/10 bg-paper p-4 shadow-apple sm:flex-row"
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ASA-XXXX"
            dir="ltr"
            className="min-h-14 min-w-0 flex-1 rounded-none border border-steel/40 bg-mist/60 px-5 text-center font-data text-lg font-semibold tracking-[0.2em] text-ink outline-none transition placeholder:text-steel focus:border-accent focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !code}
            className="min-h-14 rounded-none bg-ink px-8 font-display text-base font-bold text-white transition-colors hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:bg-steel disabled:text-white"
          >
            {loading ? "در حال بررسی..." : "پیگیری"}
          </button>
        </form>

        {error ? (
          <p className="mt-6 rounded-sm border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
            {error}
          </p>
        ) : null}

        {data ? <TrackingResult data={data} onChanged={() => lookup(data.tracking_code)} /> : null}
      </div>
    </main>
  );
}

function TrackingResult({ data, onChanged }: { data: TrackingPayload; onChanged: () => void }) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-none border border-ink/10 bg-paper p-6 shadow-card sm:p-8">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.14em] text-steel">شرکت متقاضی</p>
            <p className="font-display text-lg font-bold text-ink">{data.company_name}</p>
          </div>
          <span className="rounded-none border border-accent/30 bg-accent-soft px-4 py-1.5 text-sm font-bold text-accent-dark">
            {data.status_display}
          </span>
        </div>
        <TrackingStepper steps={data.steps} current={data.current_step} />
      </section>

      {data.status === "completed" ? <CompletedCard data={data} /> : null}

      {data.is_under_review ? <FixCenter data={data} onChanged={onChanged} /> : null}
    </div>
  );
}

function CompletedCard({ data }: { data: TrackingPayload }) {
  return (
    <section className="rounded-none border border-accent/30 bg-accent-soft p-6 text-center shadow-sm sm:p-8">
      <h3 className="mb-1 font-display text-lg font-bold text-accent-dark">
        گواهی‌نامه ایمنی شما صادر شد
      </h3>
      <p className="mb-5 text-sm leading-7 text-ink/70">
        تمام مراحل با موفقیت به پایان رسید. می‌توانید فایل گواهی‌نامه را دریافت کنید.
      </p>
      {data.certificate_url ? (
        <a
          href={data.certificate_url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-none bg-ink px-8 font-display text-base font-bold text-white transition-colors hover:bg-accent hover:text-ink"
        >
          <span aria-hidden="true">⬇</span>
          دانلود گواهی‌نامه
        </a>
      ) : (
        <p className="text-sm text-ink/60">فایل گواهی‌نامه در حال آماده‌سازی است.</p>
      )}
    </section>
  );
}

function FixCenter({ data, onChanged }: { data: TrackingPayload; onChanged: () => void }) {
  return (
    <>
      {data.outstanding_defects.length > 0 ? (
        <section className="rounded-none border border-ink/10 bg-paper p-6 shadow-soft sm:p-7">
          <h3 className="mb-1 font-display text-lg font-bold text-ink">رفع نواقص فنی</h3>
          <p className="mb-5 text-sm text-steel-dark">
            برای هر نقص، تصویر مدرک رفع آن را بارگذاری کنید تا توسط کارشناس بررسی شود.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.outstanding_defects.map((defect) => (
              <DefectCard key={defect.key} code={data.tracking_code} defect={defect} onChanged={onChanged} />
            ))}
          </div>
        </section>
      ) : null}

      {data.final_payment_upload_url ? (
        <section className="rounded-none border border-ink/10 bg-paper p-6 shadow-soft sm:p-7">
          <h3 className="mb-1 font-display text-lg font-bold text-ink">تسویه نهایی</h3>
          {data.payments.stage_2 ? (
            <p className="rounded-sm bg-accent-soft p-4 text-sm text-accent-dark">
              رسید تسویه ثبت شده است
              {data.payments.stage_2.is_approved ? " و تأیید شد." : " و در انتظار تأیید است."}
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-steel-dark">
                مبلغ تسویه نهایی را واریز و تصویر رسید را بارگذاری کنید.
              </p>
              <UploadSlot
                label="بارگذاری رسید تسویه نهایی"
                onUpload={(file) => uploadFinalPayment(data.tracking_code, file)}
                onDone={onChanged}
              />
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

function DefectCard({
  code,
  defect,
  onChanged,
}: {
  code: string;
  defect: OutstandingDefect;
  onChanged: () => void;
}) {
  return (
    <div className="rounded-none border border-steel/30 bg-white p-4">
      <p className="font-semibold text-ink">{defect.label}</p>
      {defect.comment ? <p className="mb-3 mt-1 text-xs leading-6 text-steel-dark">{defect.comment}</p> : null}
      {defect.fix_image_url ? (
        <p className="rounded-sm bg-accent-soft p-2.5 text-xs text-accent-dark">
          مدرک ارسال شد؛ در انتظار تأیید کارشناس.
        </p>
      ) : (
        <UploadSlot
          label="بارگذاری مدرک رفع نقص"
          onUpload={(file) => uploadFix(code, defect.key, file)}
          onDone={onChanged}
        />
      )}
    </div>
  );
}

function UploadSlot({
  label,
  onUpload,
  onDone,
}: {
  label: string;
  onUpload: (file: File) => Promise<unknown>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handle(file?: File) {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    try {
      await onUpload(file);
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-dashed border-steel/40 bg-white px-4 py-3 text-sm font-semibold text-steel-dark transition hover:border-ink hover:text-ink">
        {busy ? "در حال ارسال..." : label}
        <input
          type="file"
          hidden
          accept="image/png,image/jpeg"
          onChange={(event) => handle(event.target.files?.[0])}
        />
      </label>
      {failed ? <p className="mt-2 text-xs text-rose-600">بارگذاری ناموفق بود. دوباره تلاش کنید.</p> : null}
    </div>
  );
}
