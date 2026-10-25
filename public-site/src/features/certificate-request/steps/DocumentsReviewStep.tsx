import { formatJalaliDate } from "../../../utils/jalaliDate";
import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { FileUpload } from "../../../components/ui/form/FileUpload";
import type { CertificateRequestForm } from "../schema";
import { PaymentSection } from "../PaymentSection";

const ownershipLabels: Record<string, string> = {
  owned: "ملکی",
  rented: "استیجاری",
};
const inspectionLabels: Record<string, string> = {
  initial: "اولیه",
  periodic: "ادواری",
};
const yesNoLabels: Record<string, string> = { yes: "بلی", no: "خیر" };

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-slate-400">{label}</span>
      <span className="text-left text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}

function ReviewGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">
      <p className="mb-1 text-sm font-bold text-accent-dark">{title}</p>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

export function DocumentsReviewStep({ receiptRequired = true }: { receiptRequired?: boolean }) {
  const { watch } = useFormContext<CertificateRequestForm>();
  const values = watch();

  return (
    <div className="flex flex-col gap-6">
      {/* Prominent 48-hour notice. */}
      <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft/70 p-4 text-sm leading-7 text-accent-dark sm:p-5">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs text-ink">
          ⏱
        </span>
        <span>
          <strong className="font-bold">بازدید از مجموعه شما طی ۴۸ ساعت</strong> پس از
          ارسال مدارک لازم انجام خواهد شد.
        </span>
      </div>

      <FileUpload
        name="ownershipDocument"
        label="سند مالکیت (اختیاری)"
        hint="سند مالکیت یا هر مدرکی که مالکیت قانونی مجموعه را تایید نماید."
      />

      {/* Non-blocking orange warning when the deed is left empty (per spec). */}
      {!(values.ownershipDocument instanceof File) ? (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm leading-7 text-orange-800">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-400 text-xs text-white">
            ⚠
          </span>
          <span>
            <strong className="font-bold">سند مالکیت بارگذاری نشده است.</strong> ثبت
            درخواست بدون آن امکان‌پذیر است، اما لازم است در روز بازرسی، اصل سند مالکیت
            را به کارشناس ارائه دهید.
          </span>
        </div>
      ) : null}

      <FileUpload
        name="leaseDocument"
        label="اجاره‌نامه / قرارداد تصرف (اختیاری)"
        hint="در صورت استیجاری بودن مجموعه، اجاره‌نامه یا قرارداد معتبر را بارگذاری کنید."
      />

      <FileUpload
        name="postalCodeDocument"
        label="سند تأیید کد پستی (اختیاری)"
        hint="آیا سندی دارید که این کد پستی را تأیید کند؟ (مانند قبض یا نامه رسمی با کد پستی مجموعه)"
      />

      <PaymentSection />

      <FileUpload
        name="paymentReceipt"
        label={receiptRequired ? "بارگذاری فیش واریزی" : "بارگذاری فیش واریزی (اختیاری)"}
        required={receiptRequired}
        hint={
          receiptRequired
            ? "تصویر یا فایل فیش پرداخت هزینه بازرسی را بارگذاری کنید."
            : "در صورت پرداخت پیش‌پرداخت، فیش را بارگذاری کنید؛ در غیر این صورت این مرحله اختیاری است."
        }
      />

      {/* Final review of everything entered. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-ink">بازبینی نهایی درخواست</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <ReviewGroup title="اطلاعات شرکت">
          <ReviewRow label="نام شرکت" value={values.companyName} />
          <ReviewRow label="مدیر عامل" value={values.ceoName} />
          <ReviewRow label="شماره تماس" value={values.ceoPhone} />
          <ReviewRow label="نوع فعالیت" value={values.activityType} />
          <ReviewRow label="تماس جایگزین" value={values.alternatePhone} />
          <ReviewRow label="معرف" value={values.referrerName} />
          <ReviewRow label="تاریخ درخواست" value={formatJalaliDate(values.requestDate)} />
        </ReviewGroup>

        <ReviewGroup title="مجموعه و ملک">
          <ReviewRow label="آدرس" value={values.facilityAddress} />
          <ReviewRow label="کد پستی" value={values.postalCode} />
          <ReviewRow label="زیربنای کل" value={values.totalArea} />
          <ReviewRow label="عرصه" value={values.landArea} />
          <ReviewRow label="اعیان" value={values.buildingArea} />
          <ReviewRow
            label="نوع مالکیت"
            value={values.ownershipType ? ownershipLabels[values.ownershipType] : undefined}
          />
          <ReviewRow
            label="نوع بازرسی"
            value={values.inspectionType ? inspectionLabels[values.inspectionType] : undefined}
          />
        </ReviewGroup>

        <ReviewGroup title="سیستم‌های ایمنی">
          <ReviewRow
            label="آتش‌نشانی"
            value={values.firefightingInstalled ? yesNoLabels[values.firefightingInstalled] : undefined}
          />
          <ReviewRow label="جزئیات آتش‌نشانی" value={values.firefightingDetails} />
          <ReviewRow
            label="اعلام حریق"
            value={values.fireAlarmInstalled ? yesNoLabels[values.fireAlarmInstalled] : undefined}
          />
          <ReviewRow label="جزئیات اعلام حریق" value={values.fireAlarmDetails} />
          <ReviewRow
            label="ارتینگ"
            value={values.earthingInstalled ? yesNoLabels[values.earthingInstalled] : undefined}
          />
          <ReviewRow label="سال احداث ارتینگ" value={values.earthingYear} />
          <ReviewRow label="توضیحات" value={values.notes} />
        </ReviewGroup>

        <ReviewGroup title="مدارک بارگذاری‌شده">
          <ReviewRow
            label="سند مالکیت"
            value={values.ownershipDocument instanceof File ? values.ownershipDocument.name : "ارائه در روز بازرسی"}
          />
          <ReviewRow
            label="اجاره‌نامه"
            value={values.leaseDocument instanceof File ? values.leaseDocument.name : undefined}
          />
          <ReviewRow
            label="سند تأیید کد پستی"
            value={values.postalCodeDocument instanceof File ? values.postalCodeDocument.name : undefined}
          />
          <ReviewRow
            label="فیش واریزی"
            value={values.paymentReceipt instanceof File ? values.paymentReceipt.name : undefined}
          />
        </ReviewGroup>
      </div>
    </div>
  );
}
