import { api } from "./client";
import type {
  CertificateReadiness,
  CurrentUser,
  FinancialRecord,
  ManagedUser,
  StaffRequestDetail,
  StaffRequestListItem,
} from "../types";

export type SourceFilter = "all" | "bale" | "website";

/** Query params shared by the paginated staff list endpoints. */
export interface ListParams {
  search?: string;
  scope?: "pending" | "all";
  page?: number;
  /** Intake-channel filter for the unified requests list (secretary panel). */
  source?: SourceFilter;
}

/** Shape of a DRF page: total ``count`` plus this page's ``results``. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Auth -------------------------------------------------------------------
export const login = (username: string, password: string) =>
  api.post<{ access: string; refresh: string }>("/auth/token/", { username, password });

export const fetchMe = () => api.get<CurrentUser>("/users/me/");

// Self-service profile update (name + transparent signature image), multipart.
export const updateMe = (form: FormData) =>
  api.patch<CurrentUser>("/users/me/", form);

// --- User management (CEO only) ---------------------------------------------
export const listUsers = () => api.get<ManagedUser[] | Paginated<ManagedUser>>("/users/");

export const createUser = (form: FormData) => api.post<ManagedUser>("/users/", form);

export const updateUser = (id: string, form: FormData) =>
  api.patch<ManagedUser>(`/users/${id}/`, form);

export const deleteUser = (id: string) => api.delete(`/users/${id}/`);

/** Drop empty/undefined values so we never send ``?search=`` or ``?page=1`` noise. */
function toQuery(params: ListParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.search) out.search = params.search;
  if (params.scope === "all") out.scope = "all";
  if (params.page && params.page > 1) out.page = String(params.page);
  if (params.source && params.source !== "all") out.source = params.source;
  return out;
}

// --- Secretary --------------------------------------------------------------
export const listBaleRequests = (params: ListParams = {}) =>
  api.get<Paginated<StaffRequestListItem>>("/secretary/requests/", {
    params: toQuery(params),
  });

// ``scope`` must match the list scope: the viewset filters retrieval by the same
// status window, so opening an already-registered request needs ``scope=all``.
export const getBaleRequest = (id: string, scope?: "pending" | "all") =>
  api.get<Record<string, unknown>>(`/secretary/requests/${id}/`, {
    params: scope === "all" ? { scope: "all" } : undefined,
  });

export const saveBaleRequest = (id: string, data: Record<string, unknown> | FormData) =>
  api.patch(`/secretary/requests/${id}/`, data);

export const approveBaleRequest = (id: string) =>
  api.post(`/secretary/requests/${id}/approve/`);

// Prefill for a periodic inspection: the most recent prior request for a phone.
export const getPreviousRequest = (phone: string, excludeId?: string) =>
  api.get<{ found: boolean; data: Record<string, unknown> }>(
    "/secretary/requests/previous/",
    { params: { phone, ...(excludeId ? { exclude: excludeId } : {}) } },
  );

// Non-blocking duplicate-postal-code check (warns, never blocks).
export const checkPostalCode = (postalCode: string) =>
  api.get<{ exists: boolean }>("/requests/check-postal-code/", {
    params: { postal_code: postalCode },
  });

// Schedule a request without the advance payment (needs the CEO setting ON).
export const scheduleWithoutAdvance = (id: string) =>
  api.post<{ status: string }>(
    `/financials/requests/${id}/schedule-without-advance/`,
  );

// PDF of the admin-transcribed form. Fetched as a blob so the JWT header is sent
// (a plain <a href> can't carry the in-memory access token).
export const downloadBaleFormPdf = (id: string, scope?: "pending" | "all") =>
  api.get<Blob>(`/secretary/requests/${id}/form-pdf/`, {
    responseType: "blob",
    params: scope === "all" ? { scope: "all" } : undefined,
  });

// --- Expert -----------------------------------------------------------------
export const listScheduledRequests = (params: ListParams = {}) =>
  api.get<Paginated<StaffRequestListItem>>("/inspections/scheduled-requests/", {
    params: toQuery(params),
  });

export const submitReport = (form: FormData) =>
  api.post("/inspections/reports/", form);

// Read-only full detail (incl. submitted report) for a previously-inspected case.
export const getExpertRequest = (id: string) =>
  api.get<StaffRequestDetail>(`/inspections/requests/${id}/`);

// --- CEO: financial ---------------------------------------------------------
export const listPayments = (params?: Record<string, string>) =>
  api.get<Paginated<FinancialRecord>>("/financials/payments/", { params });

export const approvePayment = (id: string) =>
  api.post<FinancialRecord>(`/financials/payments/${id}/approve/`);

export const rejectPayment = (id: string) =>
  api.post<FinancialRecord>(`/financials/payments/${id}/reject/`);

export interface SystemSettings {
  stage_1_amount: string;
  stage_2_amount: string;
  ceo_card_number: string;
  allow_inspection_without_advance: boolean;
  updated_at?: string;
}

export const getSystemSettings = () =>
  api.get<SystemSettings>("/financials/settings/");

export const updateSystemSettings = (data: Partial<SystemSettings>) =>
  api.patch<SystemSettings>("/financials/settings/", data);

// --- CEO: certificates / defects --------------------------------------------
export const listUnderReview = (params: ListParams = {}) =>
  api.get<Paginated<StaffRequestListItem>>("/ceo/certificate-requests/", {
    params: toQuery(params),
  });

// ``scope`` must match the list scope: the viewset filters retrieval by the same
// status window, so opening an already-issued request needs ``scope=all``.
export const getCertificateRequest = (id: string, scope?: "pending" | "all") =>
  api.get<StaffRequestDetail>(`/ceo/certificate-requests/${id}/`, {
    params: scope === "all" ? { scope: "all" } : undefined,
  });

export const getCertificateReadiness = (id: string, scope?: "pending" | "all") =>
  api.get<CertificateReadiness>(`/ceo/certificate-requests/${id}/certificate-readiness/`, {
    params: scope === "all" ? { scope: "all" } : undefined,
  });

// ``force`` overrides the soft "receipt not yet approved" check (after the admin
// confirms the warning). Hard blockers are still enforced server-side.
export const issueCertificate = (id: string, force = false, content: {
  certificate_description: string;
  certificate_number: string;
  certificate_usage_type: string;
  certificate_attachment: string;
}) =>
  api.post<{ certificate_url: string }>(
    `/ceo/certificate-requests/${id}/issue-certificate/`,
    { ...content, force },
  );

export const updateDefects = (requestId: string, flags: Record<string, boolean>) =>
  api.patch(`/inspections/reports/${requestId}/defects/`, flags);

// Normalizes DRF paginated or plain list responses.
export function unwrapList<T>(data: { results: T[] } | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}
