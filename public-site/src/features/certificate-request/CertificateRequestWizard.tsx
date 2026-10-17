import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import {
  fetchPublicConfig,
  submitCertificateRequest,
} from "../../services/certificateService";
import { StepProgress } from "./StepProgress";
import { SuccessScreen } from "./SuccessScreen";
import {
  buildCertificateRequestSchema,
  defaultValues,
  type CertificateRequestForm,
} from "./schema";
import { steps } from "./steps";
import { CompanyInfoStep } from "./steps/CompanyInfoStep";
import { DocumentsReviewStep } from "./steps/DocumentsReviewStep";
import { FacilityInfoStep } from "./steps/FacilityInfoStep";

type SubmittedState = {
  trackingCode: string;
  warnings: string[];
  documentNames: string[];
};

export function CertificateRequestWizard() {
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState<SubmittedState | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The advance-payment receipt is required unless the CEO has enabled
  // "inspection without advance". We read the flag live from public config; a ref
  // feeds the (stable) resolver while state drives the receipt field's UI.
  const [receiptRequired, setReceiptRequired] = useState(true);
  const receiptRequiredRef = useRef(true);
  useEffect(() => {
    fetchPublicConfig()
      .then((config) => {
        const required = !config.allow_inspection_without_advance;
        receiptRequiredRef.current = required;
        setReceiptRequired(required);
      })
      .catch(() => {
        /* keep the safe default: receipt required */
      });
  }, []);

  const resolver = useMemo<Resolver<CertificateRequestForm>>(
    () => (values, context, options) =>
      zodResolver(buildCertificateRequestSchema(receiptRequiredRef.current))(
        values,
        context,
        options,
      ),
    [],
  );

  const methods = useForm<CertificateRequestForm>({
    // Cast: defaults intentionally omit the required File fields (no sensible
    // empty File), which zod fills in on submit.
    defaultValues: defaultValues as CertificateRequestForm,
    resolver,
    mode: "onTouched",
  });

  const {
    handleSubmit,
    trigger,
    formState: { isSubmitting },
  } = methods;

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  async function goNext() {
    // Validate only the fields owned by this step before advancing.
    const valid = await trigger(step.fields);
    if (valid) {
      setCurrentStep((index) => Math.min(index + 1, steps.length - 1));
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  function goBack() {
    setCurrentStep((index) => Math.max(index - 1, 0));
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      const result = await submitCertificateRequest(data);
      const names = [
        data.ownershipDocument instanceof File ? data.ownershipDocument.name : null,
        data.leaseDocument instanceof File ? data.leaseDocument.name : null,
        data.paymentReceipt instanceof File ? data.paymentReceipt.name : null,
      ].filter((name): name is string => Boolean(name));
      setSubmitted({
        trackingCode: result.tracking_code,
        warnings: result.warnings ?? [],
        documentNames: names,
      });
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    } catch {
      setSubmitError(
        "ثبت درخواست با خطا مواجه شد. لطفاً اطلاعات واردشده را بررسی کرده و دوباره تلاش کنید.",
      );
    }
  });

  if (submitted) {
    return (
      <Shell>
        <SuccessScreen
          trackingCode={submitted.trackingCode}
          warnings={submitted.warnings}
          documentNames={submitted.documentNames}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <StepProgress current={currentStep} />

      <div className="mb-7">
        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-steel-dark">
          <span className="h-1.5 w-1.5 bg-accent" aria-hidden="true" />
          {step.eyebrow}
        </span>
        <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.9rem]">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-steel-dark">{step.description}</p>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.id}
              initial={reduceMotion ? false : { opacity: 0, x: 24 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {step.id === "company" ? <CompanyInfoStep /> : null}
              {step.id === "facility" ? <FacilityInfoStep /> : null}
              {step.id === "documents" ? (
                <DocumentsReviewStep receiptRequired={receiptRequired} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {submitError ? (
            <p className="mt-6 rounded-sm border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
              {submitError}
            </p>
          ) : null}

          <div className="mt-9 flex items-center justify-between gap-3 border-t border-steel/20 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 0}
              className="rounded-sm px-6 py-3 text-sm font-semibold text-steel-dark transition hover:bg-mist disabled:invisible"
            >
              مرحله قبل
            </button>

            {isLastStep ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-none bg-ink px-8 py-3.5 font-display text-base font-bold text-white transition-colors duration-200 hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:bg-steel disabled:text-white"
              >
                {isSubmitting ? "در حال ارسال..." : "ثبت و ارسال درخواست"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="rounded-none bg-ink px-8 py-3.5 font-display text-base font-bold text-white transition-colors duration-200 hover:bg-accent hover:text-ink"
              >
                مرحله بعد
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </Shell>
  );
}

// The sharp, structured card the whole wizard lives in, matching the site's
// industrial sections. A steel-blue top rule marks it as an active workspace.
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-none border border-ink/10 bg-paper p-5 shadow-apple sm:p-8 lg:p-10">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="relative">{children}</div>
    </div>
  );
}
