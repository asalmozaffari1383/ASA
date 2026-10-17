import { useEffect, useState } from "react";
import { formatThousands } from "../../utils/persianDigits";
import { fetchPublicConfig } from "../../services/certificateService";
import { paymentInfo } from "./schema";

function formatCard(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1-") || raw;
}

// Shows the inspection fee and destination card, with a one-tap copy for the card
// number. The amount + card are fetched live from the backend (`/public/config/`),
// falling back to the bundled defaults while loading or if the request fails.
export function PaymentSection() {
  const [copied, setCopied] = useState(false);
  const [amountRial, setAmountRial] = useState<number>(paymentInfo.amountRial);
  const [cardNumber, setCardNumber] = useState<string>(paymentInfo.cardNumber);

  useEffect(() => {
    let active = true;
    fetchPublicConfig()
      .then((config) => {
        if (!active) return;
        const amount = Number(config.stage_1_amount);
        if (Number.isFinite(amount) && amount > 0) setAmountRial(amount);
        if (config.ceo_card_number) setCardNumber(config.ceo_card_number);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(cardNumber);
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
          <p className="text-xs uppercase tracking-[0.1em] text-steel">شماره کارت</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span dir="ltr" className="font-data text-lg font-bold tracking-wider text-ink">
              {formatCard(cardNumber)}
            </span>
            <button
              type="button"
              onClick={copyCard}
              className="shrink-0 rounded-sm bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-dark transition hover:bg-accent hover:text-ink"
            >
              {copied ? "کپی شد" : "کپی"}
            </button>
          </div>
          <p className="mt-2 text-xs text-steel-dark">به نام {paymentInfo.accountHolder}</p>
        </div>
      </div>
    </div>
  );
}
