import { apiClient } from "./apiClient";
import { toLatinDigits } from "../utils/persianDigits";
import type { CertificateRequestForm } from "../features/certificate-request/schema";
import type { CertificateResult } from "../types/content";
import type { PublicConfig, SubmitResult } from "./types";

// --- Certificate validity lookup (still mocked; not yet backed by an endpoint) ---
export async function verifyCertificate(
  certificateNumber: string,
): Promise<CertificateResult> {
  const normalizedCertificateNumber = certificateNumber.trim();

  await new Promise((resolve) => window.setTimeout(resolve, 350));

  if (!normalizedCertificateNumber) {
    return { status: "invalid", certificateNumber: "", message: "لطفاً شماره گواهی را وارد کنید." };
  }
  return {
    status: "valid",
    certificateNumber: normalizedCertificateNumber,
    validUntil: "۱۴۰۳/۱۲/۲۹",
    message: "گواهی معتبر است",
  };
}

// --- Public config (dynamic stage-1 amount + CEO card number) ---
export async function fetchPublicConfig(): Promise<PublicConfig> {
  const { data } = await apiClient.get<PublicConfig>("/public/config/");
  return data;
}

// --- Non-blocking duplicate-postal-code check (warns, never blocks) ---
export async function checkPostalCodeExists(postalCode: string): Promise<boolean> {
  const { data } = await apiClient.get<{ exists: boolean }>(
    "/requests/check-postal-code/",
    { params: { postal_code: postalCode } },
  );
  return data.exists;
}

const OWNERSHIP_MAP: Record<string, string> = { owned: "malki", rented: "estijari" };

/** Map the site's yes/no/undefined to the backend's true/false/null (omit = null). */
function appendThreeState(
  fd: FormData,
  field: string,
  value: "yes" | "no" | undefined,
) {
  if (value === "yes") fd.append(field, "true");
  else if (value === "no") fd.append(field, "false");
  // undefined → "Unknown": leave the field out, backend stores null.
}

function toInteger(value?: string): string | null {
  if (!value) return null;
  const n = Math.round(Number(toLatinDigits(value)));
  return Number.isFinite(n) && n >= 0 ? String(n) : null;
}

/**
 * Submit the certificate request to the anonymous public-submit endpoint.
 * Assembles a multipart body, mapping the site's field names to the backend's,
 * and returns the generated tracking code plus any server-side warnings
 * (e.g. the missing-deed notice).
 */
export async function submitCertificateRequest(
  data: CertificateRequestForm,
): Promise<SubmitResult> {
  const fd = new FormData();

  // Applicant
  fd.append("company_name", data.companyName);
  fd.append("ceo_name", data.ceoName);
  fd.append("ceo_phone", toLatinDigits(data.ceoPhone));
  fd.append("activity_type", data.activityType);
  fd.append("address", data.facilityAddress);
  const alt = data.alternatePhone ? toLatinDigits(data.alternatePhone) : "";
  if (/^09\d{9}$/.test(alt)) fd.append("backup_phone", alt);
  if (data.postalCode) fd.append("postal_code", toLatinDigits(data.postalCode));
  if (data.referrerName) fd.append("referrer_name", data.referrerName);

  // Areas — backend requires both land & building; fall back to the total floor area.
  const building = toInteger(data.buildingArea) ?? toInteger(data.totalArea);
  const land = toInteger(data.landArea) ?? toInteger(data.totalArea);
  if (building) fd.append("total_area_building", building);
  if (land) fd.append("total_area_land", land);

  fd.append("ownership_type", OWNERSHIP_MAP[data.ownershipType] ?? "malki");
  if (data.inspectionType) fd.append("inspection_type", data.inspectionType);

  // Three-state systems (Yes/No/Unknown)
  appendThreeState(fd, "has_fire_extinguisher_system", data.firefightingInstalled);
  if (data.firefightingInstalled === "yes" && data.firefightingDetails)
    fd.append("fire_extinguisher_details", data.firefightingDetails);
  appendThreeState(fd, "has_fire_alarm_system", data.fireAlarmInstalled);
  if (data.fireAlarmInstalled === "yes" && data.fireAlarmDetails)
    fd.append("fire_alarm_details", data.fireAlarmDetails);
  appendThreeState(fd, "has_earthing_system", data.earthingInstalled);
  if (data.earthingInstalled === "yes" && data.earthingYear)
    fd.append("earthing_year", toLatinDigits(data.earthingYear).slice(0, 4));

  // Files — deed, lease & postal-code document optional. The receipt is optional
  // only when the CEO has enabled inspections without the advance payment.
  if (data.ownershipDocument instanceof File && data.ownershipDocument.size > 0)
    fd.append("deed_file", data.ownershipDocument);
  if (data.leaseDocument instanceof File && data.leaseDocument.size > 0)
    fd.append("lease_file", data.leaseDocument);
  if (data.postalCodeDocument instanceof File && data.postalCodeDocument.size > 0)
    fd.append("postal_code_document", data.postalCodeDocument);
  if (data.paymentReceipt instanceof File && data.paymentReceipt.size > 0)
    fd.append("stage_1_receipt", data.paymentReceipt);

  const { data: result } = await apiClient.post<SubmitResult>(
    "/requests/public-submit/",
    fd,
  );
  return result;
}
