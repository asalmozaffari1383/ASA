// API types mirroring the DRF responses consumed by the public site.

export type RequestStatus =
  | "pending_review"
  | "pending_payment"
  | "bale_photo_uploaded"
  | "scheduled"
  | "under_review"
  | "completed";

export interface PublicConfig {
  stage_1_amount: string;
  stage_2_amount: string;
  ceo_card_number: string;
  /** When true, the advance-payment receipt is optional on submission. */
  allow_inspection_without_advance: boolean;
}

export interface SubmitResult {
  tracking_code: string;
  stage_1_amount: string | null;
  warnings: string[];
}

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
  /** Signed URL of the issued certificate PDF; present only once completed. */
  certificate_url: string | null;
}
