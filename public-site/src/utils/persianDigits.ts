// Users typically type Persian (۰-۹) or Arabic-Indic (٠-٩) digits. Validation and
// any future backend expect Latin digits, so normalize before checking/sending.

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex > -1) return String(persianIndex);
    const arabicIndex = ARABIC_DIGITS.indexOf(char);
    if (arabicIndex > -1) return String(arabicIndex);
    return char;
  });
}

/** Latin digits grouped in threes with the Persian thousands separator (٬). */
export function formatThousands(value: number | string): string {
  const digits = toLatinDigits(String(value)).replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
}
