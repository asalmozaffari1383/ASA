import { z } from "zod";
import { toLatinDigits } from "../../utils/persianDigits";

// Document uploads — the backend validates real MIME via python-magic and accepts
// only PDF / JPEG / PNG, so the client allowlist matches exactly (no webp).
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const requiredText = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message);

// Persian/Arabic digits are normalized to Latin before the pattern check, so a
// user typing ۰۹۱۲… or ۱۰ rooms validates the same as Latin input.
const digitsField = (pattern: RegExp, message: string, requiredMessage: string) =>
  requiredText(requiredMessage).refine(
    (value) => pattern.test(toLatinDigits(value)),
    message,
  );

const requiredFile = z
  .instanceof(File, { error: "بارگذاری این فایل الزامی است." })
  .refine((file) => file.size > 0, "بارگذاری این فایل الزامی است.")
  .refine((file) => file.size <= MAX_FILE_SIZE, "حجم فایل نباید بیش از ۵ مگابایت باشد.")
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    "فرمت مجاز: PDF، JPG یا PNG.",
  );

// Optional document (deed / lease): may be omitted, but if present must pass the
// same size/type checks. The deed is intentionally optional — see the orange
// warning in the documents step.
const optionalFile = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, "حجم فایل نباید بیش از ۵ مگابایت باشد.")
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    "فرمت مجاز: PDF، JPG یا PNG.",
  )
  .optional();

export const ownershipTypes = ["owned", "rented"] as const;
export const inspectionTypes = ["initial", "periodic"] as const;
export const yesNoValues = ["yes", "no"] as const;

export const certificateRequestSchema = z.object({
  // Step 1 — Company information
  companyName: requiredText("نام شرکت متقاضی الزامی است."),
  ceoName: requiredText("نام و نام خانوادگی مدیر عامل الزامی است."),
  ceoPhone: digitsField(
    /^09\d{9}$/,
    "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.",
    "شماره تماس مدیر عامل الزامی است.",
  ),
  activityType: requiredText("نوع فعالیت شرکت الزامی است."),
  alternatePhone: z.string().trim().optional(),
  referrerName: z.string().trim().optional(),
  requestDate: z.string().trim().optional(),

  // Step 2 — Property & facility
  facilityAddress: requiredText("آدرس مجموعه الزامی است."),
  postalCode: digitsField(
    /^\d{10}$/,
    "کد پستی باید ۱۰ رقم باشد.",
    "کد پستی مجموعه الزامی است.",
  ),
  totalArea: digitsField(
    /^\d+(\.\d+)?$/,
    "زیربنا را به صورت عدد (متر مربع) وارد کنید.",
    "زیربنای کل مجموعه الزامی است.",
  ),
  landArea: z.string().trim().optional(),
  buildingArea: z.string().trim().optional(),
  ownershipType: z.enum(ownershipTypes, {
    error: "نوع مالکیت را انتخاب کنید.",
  }),
  inspectionType: z.enum(inspectionTypes).optional(),

  // Step 2 — Optional facility systems
  firefightingInstalled: z.enum(yesNoValues).optional(),
  firefightingDetails: z.string().trim().optional(),
  fireAlarmInstalled: z.enum(yesNoValues).optional(),
  fireAlarmDetails: z.string().trim().optional(),
  earthingInstalled: z.enum(yesNoValues).optional(),
  earthingYear: z.string().trim().optional(),
  notes: z.string().trim().optional(),

  // Step 3 — Documents & payment.
  // Deed is OPTIONAL (the applicant may present it on inspection day — a warning
  // is shown). Lease and the postal-code verification document are optional. The
  // payment receipt is required by the schema, but the wizard relaxes it to
  // optional when the CEO has enabled "inspection without advance" (see
  // ``buildSchema`` below / the config flag passed to the resolver).
  ownershipDocument: optionalFile,
  leaseDocument: optionalFile,
  postalCodeDocument: optionalFile,
  paymentReceipt: requiredFile,
});

/**
 * Schema variant used when the advance payment is optional (CEO setting). Only
 * the receipt requirement is relaxed; everything else is identical.
 */
export function buildCertificateRequestSchema(
  receiptRequired: boolean,
): typeof certificateRequestSchema {
  if (receiptRequired) return certificateRequestSchema;
  // Only the receipt requirement is relaxed at runtime; the static type stays the
  // base schema so react-hook-form's form type is unaffected.
  return certificateRequestSchema.extend({
    paymentReceipt: optionalFile,
  }) as unknown as typeof certificateRequestSchema;
}

export type CertificateRequestForm = z.infer<typeof certificateRequestSchema>;

// Drives the form: react-hook-form needs a defined starting shape so every field
// is controlled from the first render (especially the optional ones).
export const defaultValues: Partial<CertificateRequestForm> = {
  companyName: "",
  ceoName: "",
  ceoPhone: "",
  activityType: "",
  alternatePhone: "",
  referrerName: "",
  requestDate: "",
  facilityAddress: "",
  postalCode: "",
  totalArea: "",
  landArea: "",
  buildingArea: "",
  inspectionType: undefined,
  firefightingInstalled: undefined,
  firefightingDetails: "",
  fireAlarmInstalled: undefined,
  fireAlarmDetails: "",
  earthingInstalled: undefined,
  earthingYear: "",
  notes: "",
};

export const paymentInfo = {
  amountRial: 30_000_000,
  cardNumber: import.meta.env.VITE_PAYMENT_CARD_NUMBER ?? "",
  accountHolder: import.meta.env.VITE_PAYMENT_ACCOUNT_HOLDER ?? "",
} as const;
