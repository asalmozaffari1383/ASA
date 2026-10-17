import { apiClient } from "./apiClient";
import type { TrackingPayload } from "./types";

// All anonymous, throttled tracking-side calls. Paths are built from the tracking
// code + defect key (no need to parse the absolute URLs the API also returns), so
// every request stays same-origin through the Vite proxy.

export async function trackRequest(code: string): Promise<TrackingPayload> {
  const { data } = await apiClient.get<TrackingPayload>("/requests/track/", {
    params: { code: code.trim() },
  });
  return data;
}

export async function uploadFix(code: string, defectKey: string, image: File): Promise<void> {
  const fd = new FormData();
  fd.append("image", image);
  await apiClient.post(
    `/requests/${encodeURIComponent(code)}/fixes/${encodeURIComponent(defectKey)}/`,
    fd,
  );
}

export async function uploadFinalPayment(code: string, receipt: File): Promise<void> {
  const fd = new FormData();
  fd.append("receipt_image", receipt);
  await apiClient.post(`/requests/${encodeURIComponent(code)}/final-payment/`, fd);
}
