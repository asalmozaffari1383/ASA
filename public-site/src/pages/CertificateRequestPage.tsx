import { Link } from "react-router-dom";
import { CertificateRequestWizard } from "../features/certificate-request/CertificateRequestWizard";

export function CertificateRequestPage() {
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
            درخواست بازرسی
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink-deep sm:text-5xl">
            فرم درخواست بازرسی و صدور گواهی
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-steel-dark">
            در سه مرحله کوتاه اطلاعات مجموعه را ثبت کنید؛ کارشناسان ما طی ۴۸ ساعت پس از
            ارسال مدارک با شما هماهنگ می‌کنند.
          </p>
        </div>

        <CertificateRequestWizard />
      </div>
    </main>
  );
}
