import { useEffect, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { api } from "../../api/client";

type ContactLink = { kind: string; label: string; text: string; href: string };
type Contact = { title: string; subtitle: string; services_title: string; services: string[]; links: ContactLink[] };
const icons = { phone: "تلفن", mail: "ایمیل", instagram: "اینستاگرام", web: "وب‌سایت", map: "نشانی", chat: "پیام‌رسان" };
function message(error: unknown) {
  if (isAxiosError(error) && error.response?.data) {
    const flatten = (value: unknown): string[] => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(flatten) : [];
    return flatten(error.response.data).join("؛ ");
  }
  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}
export function SiteContact() {
  const [draft, setDraft] = useState<Contact | null>(null);
  const [services, setServices] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function load() {
    setError(""); setLoading(true);
    try { const { data } = await api.get<Contact>("/ceo/site-contact/"); setDraft(data); setServices(data.services.join("\n")); }
    catch (failure) { setError(message(failure)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(values: Partial<Contact>) { setDraft(current => current ? { ...current, ...values } : null); setDirty(true); setSaved(false); }
  function changeLink(index: number, values: Partial<ContactLink>) { if (draft) change({ links: draft.links.map((link, position) => position === index ? { ...link, ...values } : link) }); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const { data } = await api.patch<Contact>("/ceo/site-contact/", { title: draft.title, subtitle: draft.subtitle, services_title: draft.services_title, services: services.split("\n").map(item => item.trim()).filter(Boolean), links: draft.links });
      setDraft(data); setServices(data.services.join("\n")); setDirty(false); setSaved(true);
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-4xl space-y-5">
    <div><h1 className="text-2xl font-bold">تماس با ما</h1><p className="mt-2 text-sm leading-7 text-slate-500">اطلاعات پنجره تماس سایت را ویرایش کنید. آیکن، عنوان، متن و مقصد هر کارت قابل تغییر است.</p></div>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}{!draft && <button className="mr-3 underline" disabled={loading} onClick={() => void load()}>تلاش دوباره</button>}</div>}
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">ذخیره شد. پنجره تماس سایت را ببندید و دوباره باز کنید تا تغییرات را ببینید.</p>}
    {loading ? <p role="status">در حال دریافت تنظیمات…</p> : draft && <form onSubmit={save} className="card">
      <fieldset disabled={busy} className="space-y-5">
        {([ ["title", "عنوان پنجره", 100], ["subtitle", "نام شرکت / زیرعنوان", 200], ["services_title", "عنوان بخش خدمات", 200] ] as const).map(([field, label, max]) => <label key={field} className="block"><span className="label">{label}</span><input className="input" maxLength={max} required={field === "title"} value={draft[field]} onChange={event => change({ [field]: event.target.value })} /></label>)}
        <label className="block"><span className="label">خدمات (هر خدمت در یک خط، حداکثر ۱۲ مورد)</span><textarea className="input min-h-28" value={services} onChange={event => { setServices(event.target.value); setDirty(true); setSaved(false); }} /></label>
        <div className="border-t pt-5"><h2 className="font-bold">کارت‌های تماس</h2><p className="mt-2 text-xs leading-6 text-slate-500">برای لینک از https:// استفاده کنید؛ تلفن: tel:+989123456789، ایمیل: mailto:info@asaeng.org، واتساپ: https://wa.me/989002652365. آیکن و متن هر کارت به همان مقصد وصل می‌شوند.</p></div>
        {draft.links.map((link, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold">کارت {index + 1}</h3><button type="button" className="text-sm text-red-600" onClick={() => change({ links: draft.links.filter((_, position) => position !== index) })}>حذف کارت</button></div>
          <label className="block"><span className="label">آیکن</span><select className="input" value={link.kind} onChange={event => changeLink(index, { kind: event.target.value })}>{Object.entries(icons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block"><span className="label">عنوان کارت</span><input className="input" required maxLength={100} value={link.label} onChange={event => changeLink(index, { label: event.target.value })} /></label>
          <label className="block"><span className="label">متن نمایشی / شماره</span><input className="input" required maxLength={300} value={link.text} onChange={event => changeLink(index, { text: event.target.value })} /></label>
          <label className="block"><span className="label">لینک مقصد</span><input className="input" dir="ltr" required maxLength={2000} value={link.href} onChange={event => changeLink(index, { href: event.target.value })} /></label>
          <div className="flex gap-4 text-xs"><button type="button" className="underline disabled:opacity-40" disabled={index === 0} onClick={() => { const links = [...draft.links]; [links[index - 1], links[index]] = [links[index], links[index - 1]]; change({ links }); }}>بالاتر</button><button type="button" className="underline disabled:opacity-40" disabled={index === draft.links.length - 1} onClick={() => { const links = [...draft.links]; [links[index], links[index + 1]] = [links[index + 1], links[index]]; change({ links }); }}>پایین‌تر</button></div>
        </div>)}
        <button type="button" className="btn-ghost" disabled={draft.links.length >= 20} onClick={() => change({ links: [...draft.links, { kind: "web", label: "", text: "", href: "https://" }] })}>+ افزودن کارت تماس</button>
        <div className="flex items-center gap-4 border-t pt-5"><button className="btn-primary" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><span className="text-xs text-slate-500">{dirty ? "تغییرات ذخیره نشده" : ""}</span></div>
      </fieldset>
    </form>}
  </section>;
}
