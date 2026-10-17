import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { RadioGroup } from "../../../components/ui/form/RadioGroup";
import { TextArea } from "../../../components/ui/form/TextArea";
import { TextInput } from "../../../components/ui/form/TextInput";
import { checkPostalCodeExists } from "../../../services/certificateService";
import { toLatinDigits } from "../../../utils/persianDigits";

const yesNoOptions = [
  { value: "yes", label: "بلی" },
  { value: "no", label: "خیر" },
];

// One installed-system row: a بلی/خیر toggle that reveals a detail field only
// when the system exists, keeping the step uncluttered.
function SystemField({
  installedName,
  label,
  detail,
}: {
  installedName: string;
  label: string;
  detail: { name: string; label: string; placeholder: string };
}) {
  const { watch } = useFormContext();
  const installed = watch(installedName) === "yes";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">
      <RadioGroup
        name={installedName}
        label={label}
        options={yesNoOptions}
        variant="pills"
      />
      {installed ? (
        <TextInput
          name={detail.name}
          label={detail.label}
          placeholder={detail.placeholder}
          className="mt-4"
        />
      ) : null}
    </div>
  );
}

function Divider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-sm font-bold text-ink">{title}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function FacilityInfoStep() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextArea
          name="facilityAddress"
          label="آدرس مجموعه مورد نظر"
          required
          rows={3}
          placeholder="آدرس کامل پستی مجموعه"
          className="sm:col-span-2"
        />
        <div>
          <TextInput
            name="postalCode"
            label="کد پستی مجموعه"
            required
            inputMode="numeric"
            dir="ltr"
            placeholder="کد پستی ۱۰ رقمی"
          />
          <PostalCodeWarning />
        </div>
        <TextInput
          name="totalArea"
          label="زیربنای کل مجموعه (متر مربع)"
          required
          inputMode="decimal"
          dir="ltr"
          placeholder="مثال: 1200"
        />
        <TextInput
          name="landArea"
          label="عرصه (متر مربع)"
          inputMode="decimal"
          dir="ltr"
          placeholder="اختیاری"
        />
        <TextInput
          name="buildingArea"
          label="اعیان (متر مربع)"
          inputMode="decimal"
          dir="ltr"
          placeholder="اختیاری"
        />
        <RadioGroup
          name="ownershipType"
          label="نوع مالکیت"
          required
          options={[
            { value: "owned", label: "ملکی" },
            { value: "rented", label: "استیجاری" },
          ]}
        />
        <RadioGroup
          name="inspectionType"
          label="نوع بازرسی"
          options={[
            { value: "initial", label: "اولیه" },
            { value: "periodic", label: "ادواری" },
          ]}
        />
      </div>

      <Divider title="سیستم‌های ایمنی موجود (اختیاری)" />

      <div className="grid gap-4 lg:grid-cols-2">
        <SystemField
          installedName="firefightingInstalled"
          label="آیا سیستم آتش‌نشانی در مجموعه اجرا شده است؟"
          detail={{
            name: "firefightingDetails",
            label: "نوع سیستم و تعداد تجهیزات",
            placeholder: "مثال: ۲ هیدرانت، جعبه آتش‌نشانی",
          }}
        />
        <SystemField
          installedName="fireAlarmInstalled"
          label="آیا سیستم اعلام حریق در مجموعه اجرا شده است؟"
          detail={{
            name: "fireAlarmDetails",
            label: "نوع سیستم و تعداد تجهیزات",
            placeholder: "مثال: ۱۲ دتکتور دودی، ۴ شستی",
          }}
        />
        <EarthingField />
        <div className="lg:pt-2">
          <TextArea
            name="notes"
            label="توضیحات تکمیلی"
            rows={4}
            placeholder="در صورت وجود هرگونه اطلاعات تکمیلی، موارد یا موانع موجود در پروژه، به‌صورت مختصر توضیح دهید."
          />
        </div>
      </div>
    </div>
  );
}

// Non-blocking warning shown when the entered postal code has been used before.
// The applicant can still submit — this only nudges them to double-check.
function PostalCodeWarning() {
  const { watch } = useFormContext();
  const raw = (watch("postalCode") as string) ?? "";
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const code = toLatinDigits(raw);
    if (!/^\d{10}$/.test(code)) {
      setExists(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      checkPostalCodeExists(code)
        .then((res) => !cancelled && setExists(res))
        .catch(() => !cancelled && setExists(false));
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [raw]);

  if (!exists) return null;
  return (
    <p className="mt-2 rounded-xl border border-orange-300 bg-orange-50 p-3 text-xs leading-6 text-orange-800">
      این کد پستی قبلاً ثبت شده است. در صورت اطمینان از صحت آن می‌توانید ادامه دهید.
    </p>
  );
}

function EarthingField() {
  const { watch } = useFormContext();
  const installed = watch("earthingInstalled") === "yes";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">
      <RadioGroup
        name="earthingInstalled"
        label="آیا سیستم ارتینگ در مجموعه اجرا شده است؟"
        options={yesNoOptions}
        variant="pills"
      />
      {installed ? (
        <TextInput
          name="earthingYear"
          label="سال احداث سیستم"
          inputMode="numeric"
          dir="ltr"
          placeholder="مثال: 1401"
          className="mt-4"
        />
      ) : null}
    </div>
  );
}
