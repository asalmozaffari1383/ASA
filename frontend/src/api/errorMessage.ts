import { isAxiosError } from "axios";

// Only display API validation text; HTML error pages are never user messages.
export function errorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "خطای غیرمنتظره رخ داد. دوباره تلاش کنید.";
  const status = error.response?.status;
  if (status === 413) return "حجم فایل از محدودیت سرور بیشتر است. تصویر کوچک‌تری انتخاب کنید.";
  if (status && status >= 500) return "ذخیره یا دریافت اطلاعات با خطای سرور روبه‌رو شد. دوباره تلاش کنید؛ اگر تکرار شد با پشتیبانی تماس بگیرید.";
  if (status === 401) return "نشست شما پایان یافته است. دوباره وارد پنل شوید.";
  if (status === 403) return "اجازه انجام این عملیات را ندارید.";
  const data: unknown = error.response?.data;
  function collect(value: unknown): string[] {
    if (typeof value === "string") {
      const text = value.trim();
      return text && text.length <= 500 && !/[<>]/.test(text) ? [text] : [];
    }
    if (Array.isArray(value)) return value.slice(0, 10).flatMap(collect);
    if (value && typeof value === "object") return Object.values(value).slice(0, 10).flatMap(collect);
    return [];
  }
  if (data && typeof data === "object") {
    const messages = collect(data);
    if (messages.length) return messages.slice(0, 10).join("؛ ");
  }
  if (error.response) return "درخواست انجام نشد. اطلاعات واردشده را بررسی کنید و دوباره تلاش کنید.";
  return "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";
}
