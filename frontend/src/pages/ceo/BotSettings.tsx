import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { getBotSettings, updateBotSettings, type BotSettings } from "../../api/endpoints";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { formatRials } from "../../lib/format";

const labels = {
  stage_1_amount: "مبلغ پیش‌پرداخت (ریال)",
  stage_2_amount: "مبلغ تسویه نهایی (ریال)",
  ceo_card_number: "شماره کارت",
  ceo_account_number: "شماره حساب",
  ceo_iban: "شماره شبا",
  ceo_account_holder: "نام صاحب حساب",
};

type Draft = Pick<BotSettings, keyof typeof labels>;

function digits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit) >= 0 ? "۰۱۲۳۴۵۶۷۸۹".indexOf(digit) : "٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function errorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.data) {
    return Object.values(error.response.data).flat().map(String).join("؛ ");
  }
  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}

export function BotSettingsPage() {
  const [saved, setSaved] = useState<BotSettings | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await getBotSettings();
      setSaved(data);
      setDraft(data);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function closeConfirmation() {
    if (saving) return;
    setPassword("");
    setConfirming(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !saved) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const values = Object.fromEntries(Object.keys(labels).map((field) => [field, draft[field as keyof Draft]])) as Draft;
      const { data } = await updateBotSettings({ ...values, current_password: password, expected_updated_at: saved.updated_at });
      setSaved(data);
      setDraft(data);
      setConfirming(false);
      setMessage("تنظیمات ذخیره شد؛ درخواست بعدی در بات و فرم PDF از این اطلاعات استفاده می‌کند.");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPassword(""); setSaving(false); }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">تنظیمات بات</h1><p className="mt-2 text-sm leading-7 text-slate-500">مبلغ و حساب مقصد در بات بله، فرم درخواست و سایت استفاده می‌شود. تغییرات فقط با تأیید رمز مدیر ذخیره می‌شوند.</p></div>
        <a href="https://ble.ir/AsaengBot" target="_blank" rel="noreferrer" className="btn-ghost">باز کردن بات ↗</a>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      {loading ? <Spinner /> : draft && saved ? <>
        <form className="card space-y-5" onSubmit={(event) => { event.preventDefault(); setError(""); setMessage(""); setConfirming(true); }}>
          <fieldset disabled={saving || confirming} className="grid gap-5 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof Draft)[]).map((field) => (
              <label key={field} className="block"><span className="label">{labels[field]}</span>
                <input className="input" dir={field === "ceo_account_holder" ? "rtl" : "ltr"} type="text" inputMode={field === "ceo_account_holder" || field === "ceo_iban" ? "text" : "numeric"} required={field === "stage_1_amount" || field === "stage_2_amount" || field === "ceo_account_holder"} maxLength={field === "ceo_account_holder" ? 120 : field === "ceo_iban" ? 26 : field === "ceo_card_number" ? 19 : field.includes("amount") ? 14 : 30} value={draft[field]} onChange={(event) => {
                  const value = field === "ceo_account_holder" ? event.target.value : digits(event.target.value).replace(/[ ,٬-]/g, "");
                  setDraft({ ...draft, [field]: field === "ceo_iban" ? value.toUpperCase() : value });
                  setMessage("");
                }} />
                {field.includes("amount") && <span className="mt-2 block text-xs text-slate-500">{Number(draft[field]) >= 0 ? `${Number(draft[field] || 0).toLocaleString("fa-IR")} ریال، معادل ${(Number(draft[field] || 0) / 10).toLocaleString("fa-IR")} تومان` : "مبلغ نامعتبر"}</span>}
              </label>
            ))}
          </fieldset>
          <p className="text-xs leading-7 text-slate-500">حداقل یکی از شماره‌های کارت، حساب یا شبا را وارد کنید. مبلغ پیش‌پرداخت باید بیشتر از صفر باشد. شماره شبا در صورت وجود در فرم چاپ می‌شود؛ در غیر این صورت شماره کارت یا حساب درج می‌شود.</p>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button className="btn-primary" disabled={saving}>بررسی و ذخیره تغییرات</button>
            <a className="btn-ghost" href={`${import.meta.env.VITE_API_BASE_URL ?? "/api"}/bale/application-form/`} target="_blank" rel="noreferrer">مشاهده فرم با تنظیمات ذخیره‌شده ↗</a>
            <button className="btn-ghost" type="button" disabled={saving} onClick={() => void load()}>دریافت آخرین تنظیمات</button>
          </div>
        </form>
        <div className="card space-y-4"><h2 className="font-bold">سابقه تغییرات</h2>
          {saved.recent_changes.length === 0 ? <p className="text-sm text-slate-500">هنوز تغییری ثبت نشده است.</p> : saved.recent_changes.map((change) => <article key={change.id} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold">{change.actor_username} — {new Date(change.created_at).toLocaleString("fa-IR")}</p>
            <dl className="mt-3 space-y-2 text-xs leading-7">{(Object.keys(labels) as (keyof Draft)[]).filter((field) => change.before[field] !== change.after[field]).map((field) => <div key={field}><dt className="text-slate-500">{labels[field]}</dt><dd dir={field === "ceo_account_holder" ? "rtl" : "ltr"}>{change.before[field] || "—"} ← {change.after[field] || "—"}</dd></div>)}</dl>
          </article>)}
        </div>
      </> : <button className="btn-primary" onClick={() => void load()}>تلاش دوباره</button>}
      <Modal open={confirming} onClose={closeConfirmation} title="تأیید تغییر اطلاعات پرداخت">
        {draft && <form className="space-y-5" onSubmit={save}>
          <p className="text-sm leading-7 text-slate-600">اطلاعات مقصد را بررسی کنید. این اطلاعات برای مشتری نمایش داده می‌شود.</p>
          <dl className="space-y-3 rounded-xl bg-slate-50 p-4">{(Object.keys(labels) as (keyof Draft)[]).filter((field) => draft[field]).map((field) => <div key={field}><dt className="text-xs text-slate-500">{labels[field]}</dt><dd className="mt-1 break-all font-semibold" dir={field === "ceo_account_holder" || field.includes("amount") ? "rtl" : "ltr"}>{field.includes("amount") ? formatRials(draft[field]) : draft[field]}</dd></div>)}</dl>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <label className="block"><span className="label">رمز فعلی حساب مدیر</span><input autoComplete="current-password" className="input" type="password" required maxLength={256} value={password} disabled={saving} onChange={(event) => setPassword(event.target.value)} /></label>
          <div className="flex gap-3"><button className="btn-primary" disabled={saving}>{saving ? "در حال ذخیره…" : "تأیید و ذخیره"}</button><button type="button" className="btn-ghost" disabled={saving} onClick={closeConfirmation}>انصراف</button></div>
        </form>}
      </Modal>
    </section>
  );
}
