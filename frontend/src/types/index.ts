// Shared API types mirroring the DRF serializers.

export type Role = "ceo" | "expert" | "secretary";

export interface CurrentUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: Role;
  title: string;
  signature_image: string | null;
  can_manage_financial: boolean;
  can_fill_bale_forms: boolean;
  can_do_inspection: boolean;
  can_issue_certificate: boolean;
}

export type PermissionFlag =
  | "can_manage_financial"
  | "can_fill_bale_forms"
  | "can_do_inspection"
  | "can_issue_certificate";

/** A staff account as seen through the CEO user-management endpoints. */
export interface ManagedUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: Role;
  title: string;
  is_active: boolean;
  signature_image: string | null;
  can_manage_financial: boolean;
  can_fill_bale_forms: boolean;
  can_do_inspection: boolean;
  can_issue_certificate: boolean;
}

export type RequestStatus =
  | "pending_review"
  | "pending_payment"
  | "bale_photo_uploaded"
  | "scheduled"
  | "under_review"
  | "completed";

export type ThreeState = boolean | null;

export interface StepInfo {
  key: string;
  label: string;
}

export interface OutstandingDefect {
  key: string;
  label: string;
  comment: string | null;
  is_fixed: boolean;
  fix_image_url: string | null;
  upload_url: string | null;
}

export interface PaymentSummary {
  amount: string;
  is_approved: boolean;
}

export interface TrackingPayload {
  tracking_code: string;
  company_name: string;
  status: RequestStatus;
  status_display: string;
  current_step: number;
  steps: StepInfo[];
  payments: Partial<Record<"stage_1" | "stage_2", PaymentSummary>>;
  outstanding_defects: OutstandingDefect[];
  is_under_review: boolean;
  final_payment_upload_url: string | null;
}

export interface StaffRequestListItem {
  id: string;
  tracking_code: string;
  company_name: string;
  ceo_name: string;
  ceo_phone: string;
  source: "website" | "bale";
  status: RequestStatus;
  status_display: string;
  request_date: string;
  /** Whether the stage-1 advance has been approved (prioritisation hint). */
  advance_paid?: boolean;
}

export interface FinancialRecord {
  id: string;
  tracking_code: string;
  company_name: string;
  stage: "stage_1" | "stage_2";
  stage_display: string;
  amount_charged: string;
  receipt_image: string;
  is_approved: boolean;
  approved_by_username: string | null;
  created_at: string;
}

export interface CertificateReadiness {
  can_issue: boolean;
  reasons: string[];
  /** Hard blockers (missing report / unfixed defects) — cannot be overridden. */
  blocking_reasons: string[];
  /** Whether the stage-2 receipt has been approved by finance. */
  payment_approved: boolean;
  /** True when only the payment check is outstanding (issuable with confirmation). */
  can_force: boolean;
}

export interface InspectionReport {
  id: string;
  request: string;
  expert_username: string;
  is_alarm_fixed: boolean;
  is_extinguishing_fixed: boolean;
  is_cylinders_fixed: boolean;
  is_lease_fixed: boolean;
  is_deed_fixed: boolean;
  [key: string]: unknown;
}

export interface StaffRequestDetail {
  id: string;
  tracking_code: string;
  company_name: string;
  ceo_name: string;
  status: RequestStatus;
  status_display: string;
  payments: FinancialRecord[];
  report: InspectionReport | null;
  certificate_url: string | null;
  [key: string]: unknown;
}
