import { useEffect, useState } from "react";
import { formatThousands } from "../../utils/persianDigits";
import { fetchPublicConfig } from "../../services/certificateService";
import type { PublicConfig } from "../../services/types";

function formatCard(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1-") || raw;
}

export function PaymentSection() {
  const [copied, setCopied] = useState(false);
  const [configuration, setConfiguration] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPublicConfig()
      .then((config) => {
        if (!active) return;
        setConfiguration(config);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
    };
  }, []);

  const amountRial = Number(configuration?.stage_1_amount);
  const destination = configuration?.ceo_iban || configuration?.ceo_card_number || configuration?.ceo_account_number || "";
  const destinationLabel = configuration?.ceo_iban ? "شماره شبا" : configuration?.ceo_card_number ? "شماره کارت" : "شماره حساب";
  if (loading) return <p role="status" className="rounded-lg bg-accent-soft p-5">در حال دریافت اطلاعات پرداخت…</p>;
  if (!Number.isFinite(amountRial) || amountRial <= 0 || !destination || !configuration?.ceo_account_holder) {
    return <p role="alert" className="rounded-lg bg-accent-soft p-5">اطلاعات پرداخت در دسترس نیست. پیش از واریز با شرکت تماس بگیرید یا صفحه را دوباره باز کنید.</p>;
  }

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(destination);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore silently.
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border-r-4 border-accent bg-accent-soft p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-accent-dark">
        <span className="h-1.5 w-1.5 bg-accent" />
        پرداخت هزینه بازرسی
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-sm border border-steel/20 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.1em] text-steel">مبلغ پیش‌پرداخت</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
            {formatThousands(amountRial)}{" "}
            <span className="text-base font-bold text-steel-dark">ریال</span>
          </p>
        </div>

        <div className="rounded-sm border border-steel/20 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.1em] text-steel">{destinationLabel}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span dir="ltr" className="break-all font-data text-lg font-bold tracking-wider text-ink">
              {configuration.ceo_iban ? destination : formatCard(destination)}
            </span>
            <button
              type="button"
              onClick={copyCard}
              className="shrink-0 rounded-sm bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-dark transition hover:bg-accent hover:text-ink"
            >
              {copied ? "کپی شد" : "کپی"}
            </button>
          </div>
          <p className="mt-2 text-xs text-steel-dark">به نام {configuration.ceo_account_holder}</p>
        </div>
      </div>
    </div>
  );
}
