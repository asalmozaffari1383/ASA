import type { RequestStatus } from "../types";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_review: "در انتظار بررسی",
  pending_payment: "در انتظار پرداخت",
  bale_photo_uploaded: "ثبت تصویر فرم بله",
  scheduled: "زمان‌بندی بازرسی",
  under_review: "در حال بررسی",
  completed: "تکمیل‌شده",
};

export const ROLE_OPTIONS = [
  { value: "ceo", label: "مدیرعامل" },
  { value: "expert", label: "کارشناس" },
  { value: "secretary", label: "منشی" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  ceo: "مدیرعامل",
  expert: "کارشناس",
  secretary: "منشی",
};

// Dynamic RBAC permission flags -> Farsi labels, for the user-management form.
export const PERMISSION_OPTIONS = [
  { key: "can_fill_bale_forms", label: "تکمیل فرم‌های بله" },
  { key: "can_do_inspection", label: "انجام بازرسی" },
  { key: "can_manage_financial", label: "مدیریت امور مالی" },
  { key: "can_issue_certificate", label: "صدور گواهی‌نامه" },
] as const;

export const OWNERSHIP_OPTIONS = [
  { value: "malki", label: "ملکی" },
  { value: "estijari", label: "استیجاری" },
];

export const INSPECTION_TYPE_OPTIONS = [
  { value: "initial", label: "اولیه" },
  { value: "periodic", label: "دوره‌ای" },
];

// Defect keys -> the report's writable "fixed" flag + label, for the CEO toggles.
export const DEFECT_FIELDS = [
  { key: "alarm", fixedField: "is_alarm_fixed", label: "اعلام حریق فضای مسقف" },
  { key: "extinguishing", fixedField: "is_extinguishing_fixed", label: "سیستم اطفاء حریق" },
  { key: "cylinders", fixedField: "is_cylinders_fixed", label: "کپسول‌های اطفاء حریق" },
  { key: "lease", fixedField: "is_lease_fixed", label: "اصلاح اجاره‌نامه" },
  { key: "deed", fixedField: "is_deed_fixed", label: "ارائه سند مالکیت" },
] as const;
