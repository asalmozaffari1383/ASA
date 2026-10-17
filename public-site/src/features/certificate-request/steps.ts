import type { CertificateRequestForm } from "./schema";

export type StepId = "company" | "facility" | "documents";

export type StepConfig = {
  id: StepId;
  /** Short label under the progress markers. */
  label: string;
  /** Eyebrow shown above the step heading. */
  eyebrow: string;
  title: string;
  description: string;
  /** Fields validated when leaving this step (only the required ones matter). */
  fields: (keyof CertificateRequestForm)[];
};

export const steps: StepConfig[] = [
  {
    id: "company",
    label: "اطلاعات شرکت",
    eyebrow: "گام ۱ از ۳",
    title: "اطلاعات شرکت متقاضی",
    description: "مشخصات شرکت و مدیر عامل برای هماهنگی و صدور گواهی.",
    fields: [
      "companyName",
      "ceoName",
      "ceoPhone",
      "activityType",
      "alternatePhone",
      "referrerName",
      "requestDate",
    ],
  },
  {
    id: "facility",
    label: "اطلاعات مجموعه",
    eyebrow: "گام ۲ از ۳",
    title: "اطلاعات مجموعه و ملک",
    description: "موقعیت، مساحت، نوع مالکیت و سیستم‌های ایمنی موجود.",
    fields: [
      "facilityAddress",
      "postalCode",
      "totalArea",
      "landArea",
      "buildingArea",
      "ownershipType",
      "inspectionType",
      "firefightingInstalled",
      "firefightingDetails",
      "fireAlarmInstalled",
      "fireAlarmDetails",
      "earthingInstalled",
      "earthingYear",
      "notes",
    ],
  },
  {
    id: "documents",
    label: "مدارک و پرداخت",
    eyebrow: "گام ۳ از ۳",
    title: "مدارک، پرداخت و بازبینی",
    description: "بارگذاری مدارک، پرداخت هزینه و مرور نهایی درخواست.",
    fields: ["ownershipDocument", "leaseDocument", "paymentReceipt"],
  },
];

export const stepCount = steps.length;
