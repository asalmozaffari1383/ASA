// Persian-friendly formatting helpers.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toFaDigits = (value: string | number): string =>
  String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

export const formatRials = (amount: string | number): string => {
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `${toFaDigits(n.toLocaleString("en-US"))} ریال`;
};
