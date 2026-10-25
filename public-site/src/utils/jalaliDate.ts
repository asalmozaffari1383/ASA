/** UTC-only date conversion: the displayed day never shifts with browser timezone. */
export type JalaliDate = { year: number; month: number; day: number };
const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC", numberingSystem: "latn",
});
export const jalaliMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export function toJalali(date: Date): JalaliDate {
  const parts = formatter.formatToParts(date);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}
export function jalaliToISO(year: number, month: number, day: number): string | null {
  if (![year, month, day].every(Number.isInteger) || year < 1000 || year > 1700 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Persian New Year is in March of Gregorian year +621. Binary search dates
  // using Intl's Persian calendar, including its leap-year rules.
  let low = Math.floor(Date.UTC(year + 621, 2, 1) / 86400000);
  let high = Math.floor(Date.UTC(year + 622, 3, 1) / 86400000);
  const target = year * 10000 + month * 100 + day;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const date = new Date(middle * 86400000);
    const j = toJalali(date);
    const current = j.year * 10000 + j.month * 100 + j.day;
    if (current === target) return date.toISOString().slice(0, 10);
    if (current < target) low = middle + 1; else high = middle - 1;
  }
  return null;
}
export function parseISODate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export function formatJalaliDate(value?: string): string {
  const date = parseISODate(value);
  if (!date) return "";
  const { year, month, day } = toJalali(date);
  return `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return jalaliToISO(year, 12, 30) ? 30 : 29;
}
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
