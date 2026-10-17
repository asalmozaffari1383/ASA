import { useState, type FormEvent } from "react";
import { verifyCertificate } from "../../services/certificateService";
import type { CertificateResult } from "../../types/content";
import { AnimatedSection } from "../ui/AnimatedSection";
import { SectionHeading } from "../ui/SectionHeading";

export function VerificationSection() {
  const [certificateNumber, setCertificateNumber] = useState("ASA-1403-1027");
  const [result, setResult] = useState<CertificateResult>({
    status: "valid",
    certificateNumber: "ASA-1403-1027",
    validUntil: "۱۴۰۳/۱۲/۲۹",
    message: "گواهی معتبر است",
  });
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const verificationResult = await verifyCertificate(certificateNumber);
    setResult(verificationResult);
    setIsLoading(false);
  }

  return (
    <section id="verify" className="bg-mist px-5 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <AnimatedSection className="mb-12">
          <SectionHeading
            eyebrow="استعلام گواهی"
            title="بررسی اعتبار گواهی در چند ثانیه"
          />
        </AnimatedSection>

        <AnimatedSection
          delay={0.12}
          className="clip-notch border border-ink/10 bg-paper p-5 shadow-apple sm:p-10"
        >
          <div className="mx-auto max-w-xl">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="certificate" className="sr-only">
                شماره گواهی را وارد کنید
              </label>
              <input
                id="certificate"
                type="text"
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                className="min-h-14 min-w-0 flex-1 rounded-none border border-steel/40 bg-mist/60 px-4 text-center font-data text-base font-semibold text-ink outline-none transition placeholder:font-sans placeholder:text-steel focus:border-accent focus:bg-white sm:px-5 sm:text-right sm:text-lg"
                placeholder="شماره گواهی را وارد کنید"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="min-h-14 rounded-none bg-ink px-7 font-display text-base font-bold text-white transition-colors hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:bg-steel disabled:text-white"
              >
                {isLoading ? "در حال بررسی..." : "بررسی اعتبار"}
              </button>
            </form>

            <ResultBadge result={result} />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

type ResultBadgeProps = {
  result: CertificateResult;
};

function ResultBadge({ result }: ResultBadgeProps) {
  const isValid = result.status === "valid";

  return (
    <div
      className={`mt-8 rounded-none border p-5 text-right sm:p-6 ${
        isValid
          ? "border-accent/30 bg-accent-soft"
          : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-none bg-white px-4 py-2 shadow-sm">
            <span
              className={`h-2.5 w-2.5 ${isValid ? "bg-accent" : "bg-amber-500"}`}
            />
            <span
              className={`text-sm font-bold ${
                isValid ? "text-accent-dark" : "text-amber-700"
              }`}
            >
              {result.message}
            </span>
          </div>
          {result.certificateNumber ? (
            <p className="mt-4 font-data text-sm text-steel-dark">
              شماره گواهی: {result.certificateNumber}
            </p>
          ) : null}
          {isValid ? (
            <p className="mt-2 font-display text-xl font-bold tracking-tight text-accent-dark sm:text-2xl">
              معتبر تا تاریخ: {result.validUntil}
            </p>
          ) : (
            <p className="mt-2 font-display text-xl font-bold tracking-tight text-amber-900">
              شماره گواهی برای بررسی معتبر نیست.
            </p>
          )}
        </div>

        {/* The validity seal — the page's signature, reserved for this moment. */}
        <div
          className={`relative grid h-20 w-20 shrink-0 place-items-center rounded-full text-3xl text-ink sm:h-24 sm:w-24 ${
            isValid ? "bg-accent shadow-seal" : "bg-amber-500 shadow-card"
          }`}
          aria-hidden="true"
        >
          <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-white/45" />
          <span className="relative">{isValid ? "✓" : "!"}</span>
        </div>
      </div>
    </div>
  );
}
