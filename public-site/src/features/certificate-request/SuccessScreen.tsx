import { Link } from "react-router-dom";

type SuccessScreenProps = {
  trackingCode: string;
  warnings: string[];
  documentNames: string[];
};

export function SuccessScreen({ trackingCode, warnings, documentNames }: SuccessScreenProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-accent text-3xl text-ink shadow-seal">
        <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-white/45" />
        <span className="relative">✓</span>
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        درخواست شما با موفقیت ثبت شد
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-steel-dark">
        کارشناسان ما درخواست شما را بررسی می‌کنند.
        <strong className="font-bold text-accent-dark">
          {" "}
          بازدید از مجموعه طی ۴۸ ساعت پس از ارسال مدارک{" "}
        </strong>
        انجام خواهد شد.
      </p>

      {/* The generated 8-character tracking code — issued as an ink plate,
          the same artifact the site's tracking console reads. */}
      <div className="clip-notch mt-7 bg-ink-deep p-7 text-white">
        <p className="flex items-center justify-center gap-2 text-xs font-bold tracking-[0.18em] text-white/60">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          کد رهگیری شما
        </p>
        <p className="mt-3 font-data text-4xl font-extrabold tracking-[0.25em] text-white" dir="ltr">
          {trackingCode}
        </p>
        <p className="mt-3 text-xs text-white/55">
          این کد را برای پیگیری وضعیت نزد خود نگه دارید.
        </p>
      </div>

      {warnings.map((warning) => (
        <div
          key={warning}
          className="mt-4 rounded-none border border-orange-300 bg-orange-50 p-4 text-right text-sm leading-7 text-orange-800"
        >
          {warning}
        </div>
      ))}

      {documentNames.length > 0 ? (
        <div className="mt-4 rounded-none border border-ink/10 bg-white p-5 text-right shadow-sm">
          <p className="mb-2 text-sm font-semibold text-ink">مدارک ارسال‌شده</p>
          <ul className="flex flex-col gap-1.5">
            {documentNames.map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm text-steel-dark">
                <span className="text-accent">✓</span>
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to={`/track?code=${encodeURIComponent(trackingCode)}`}
          className="inline-flex items-center justify-center gap-2 rounded-none bg-ink px-8 py-3.5 font-display text-base font-bold text-white transition-colors duration-200 hover:bg-accent hover:text-ink"
        >
          پیگیری درخواست
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-sm px-8 py-3.5 text-base font-semibold text-steel-dark transition hover:bg-mist"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
