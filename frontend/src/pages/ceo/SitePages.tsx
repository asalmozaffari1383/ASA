import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api/client";
import { errorMessage } from "../../api/errorMessage";
type Pillar = { label: string; detail: string };
type Step = { title: string; description: string };
type Content = { [key: string]: string | Pillar[] | Step[]; pillars: Pillar[]; workflow_steps: Step[] };
type Page = { content: Content; hero_image_url: string; about_image_url: string; cta_image_url: string };
type ImageField = "hero_image" | "about_image" | "cta_image";
const sections = [{"id": "hero", "label": "بالای صفحه اصلی", "fields": [{"key": "hero_eyebrow", "label": "متن بالای عنوان", "max": 300}, {"key": "hero_title", "label": "عنوان اصلی", "max": 300}, {"key": "hero_subtitle", "label": "شعار", "max": 300}, {"key": "hero_description", "label": "توضیحات", "max": 10000}, {"key": "hero_button", "label": "متن دکمه خدمات", "max": 300}, {"key": "hero_image_alt", "label": "توضیح عکس", "max": 300}]}, {"id": "about", "label": "درباره ما", "fields": [{"key": "about_eyebrow", "label": "زیرعنوان", "max": 300}, {"key": "about_title", "label": "عنوان", "max": 300}, {"key": "about_description", "label": "توضیحات اول", "max": 10000}, {"key": "about_description_extra", "label": "توضیحات دوم", "max": 10000}, {"key": "about_image_alt", "label": "توضیح عکس", "max": 300}]}, {"id": "services", "label": "عنوان بخش خدمات", "fields": [{"key": "services_eyebrow", "label": "زیرعنوان", "max": 300}, {"key": "services_title", "label": "عنوان", "max": 300}, {"key": "services_description", "label": "توضیحات", "max": 10000}]}, {"id": "process", "label": "روند صدور گواهی", "fields": [{"key": "process_eyebrow", "label": "زیرعنوان", "max": 300}, {"key": "process_title", "label": "عنوان", "max": 300}, {"key": "process_description", "label": "توضیحات", "max": 10000}]}, {"id": "clients", "label": "عنوان بخش همکاران", "fields": [{"key": "clients_eyebrow", "label": "زیرعنوان", "max": 300}, {"key": "clients_title", "label": "عنوان", "max": 300}]}, {"id": "cta", "label": "بخش پایانی صفحه اصلی", "fields": [{"key": "cta_eyebrow", "label": "زیرعنوان", "max": 300}, {"key": "cta_title", "label": "خط اول عنوان", "max": 300}, {"key": "cta_subtitle", "label": "خط دوم عنوان", "max": 300}, {"key": "cta_description", "label": "توضیحات", "max": 10000}]}];
const imageFields: { key: ImageField; label: string }[] = [{ key: "hero_image", label: "عکس بالای صفحه اصلی" }, { key: "about_image", label: "عکس درباره ما" }, { key: "cta_image", label: "عکس بخش پایانی" }];
function ImageEditor({ label, current, file, cleared, onChange }: { label: string; current: string; file?: File; cleared: boolean; onChange: (file?: File, clear?: boolean) => void }) {
  const [preview, setPreview] = useState("");
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const imageUrl = current.startsWith("/images/") ? `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5174"}${current}` : current;
  return <div className="space-y-3 rounded-xl border p-4">
    <label className="block"><span className="label">{label}</span><input key={cleared ? "clear" : "image"} type="file" className="input" accept="image/png,image/jpeg" onChange={event => onChange(event.target.files?.[0])} /></label>
    {!cleared && <img src={preview || imageUrl} alt={label} className="max-h-52 w-full rounded-lg object-contain" />}
    <p className="text-xs leading-6 text-slate-500">JPG یا PNG تا ۵ مگابایت؛ انتخاب نکردن فایل، عکس فعلی را حفظ می‌کند. پیشنهاد: عکس افقی.</p>
    <button type="button" className="btn-ghost" onClick={() => onChange(undefined, !cleared)}>{cleared ? "لغو بازگشت به عکس پیش‌فرض" : "بازگشت به عکس پیش‌فرض"}</button>
  </div>;
}
export function SitePages() {
  const [draft, setDraft] = useState<Page | null>(null);
  const [files, setFiles] = useState<Partial<Record<ImageField, File>>>({});
  const [clear, setClear] = useState<Partial<Record<ImageField, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState(0);
  async function load() {
    setLoading(true); setError("");
    try { setDraft((await api.get<Page>("/ceo/page-content/")).data); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  function change(key: string, value: string | Pillar[] | Step[]) { setDraft(current => current ? { ...current, content: { ...current.content, [key]: value } } : null); setDirty(true); setSaved(false); }
  function image(key: ImageField, file?: File, reset = false) {
    if (file && (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError("عکس JPG یا PNG با حجم حداکثر ۵ مگابایت انتخاب کنید."); setVersion(value => value + 1); return; }
    setFiles(current => ({ ...current, [key]: file })); setClear(current => ({ ...current, [key]: reset })); setDirty(true); setSaved(false); setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft || busy) return;
    setBusy(true); setError(""); setSaved(false);
    const body = new FormData(); body.append("content", JSON.stringify(draft.content));
    for (const { key } of imageFields) { if (files[key]) body.append(key, files[key]!); if (clear[key]) body.append("clear_" + key, "true"); }
    try { setDraft((await api.patch<Page>("/ceo/page-content/", body)).data); setFiles({}); setClear({}); setVersion(value => value + 1); setDirty(false); setSaved(true); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-4xl space-y-5">
    <h1 className="text-2xl font-bold">صفحه اصلی و درباره ما</h1>
    <p className="text-sm leading-7 text-slate-500">عکس‌ها، عنوان‌ها و توضیحات سایت را تغییر دهید و ذخیره کنید. عکس و متن کارت‌های خدمات از بخش «محتوای سایت» و لوگوها از «لوگوی همکاران» مدیریت می‌شوند.</p>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}{!draft && <button type="button" disabled={loading} onClick={() => void load()} className="mr-3 underline">تلاش دوباره</button>}</div>}
    {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">ذخیره شد. صفحه اصلی سایت را تازه کنید تا تغییرات را ببینید.</p>}
    {loading ? <p role="status">در حال دریافت محتوا…</p> : draft && <form onSubmit={save}><fieldset disabled={busy} className="space-y-6">
      {sections.map(section => <div key={section.id} className="card space-y-5"><h2 className="text-xl font-bold">{section.label}</h2>
        {section.fields.map(field => <label key={field.key} className="block"><span className="label">{field.label}</span><textarea className={`input ${field.max > 300 ? "min-h-32" : "min-h-16"}`} maxLength={field.max} value={draft.content[field.key] as string} onChange={event => change(field.key, event.target.value)} /></label>)}
        {imageFields.filter(field => field.key.startsWith(section.id + "_")).map(field => <ImageEditor key={field.key + version} label={field.label} current={draft[`${field.key}_url`]} file={files[field.key]} cleared={!!clear[field.key]} onChange={(file, reset) => image(field.key, file, reset)} />)}
        {section.id === "about" && <div className="space-y-4"><h3 className="font-bold">کارت‌های درباره ما</h3>{draft.content.pillars.map((pillar, index) => <div key={index} className="space-y-3 rounded-xl border p-4"><label className="block"><span className="label">عنوان کارت</span><input className="input" required maxLength={200} value={pillar.label} onChange={event => change("pillars", draft.content.pillars.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label><label className="block"><span className="label">توضیحات کارت</span><textarea className="input" maxLength={2000} value={pillar.detail} onChange={event => change("pillars", draft.content.pillars.map((item, i) => i === index ? { ...item, detail: event.target.value } : item))} /></label><button type="button" className="text-red-700" onClick={() => change("pillars", draft.content.pillars.filter((_, i) => i !== index))}>حذف کارت</button></div>)}<button type="button" className="btn-ghost" disabled={draft.content.pillars.length >= 8} onClick={() => change("pillars", [...draft.content.pillars, { label: "", detail: "" }])}>افزودن کارت</button></div>}
        {section.id === "process" && <div className="space-y-4">{draft.content.workflow_steps.map((step, index) => <div key={index} className="space-y-3 rounded-xl border p-4"><h3 className="font-bold">مرحله {(index + 1).toLocaleString("fa-IR")}</h3><label className="block"><span className="label">عنوان مرحله</span><input className="input" required maxLength={200} value={step.title} onChange={event => change("workflow_steps", draft.content.workflow_steps.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} /></label><label className="block"><span className="label">توضیحات مرحله</span><textarea className="input" maxLength={2000} value={step.description} onChange={event => change("workflow_steps", draft.content.workflow_steps.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} /></label><button type="button" className="text-red-700" onClick={() => change("workflow_steps", draft.content.workflow_steps.filter((_, i) => i !== index))}>حذف مرحله</button></div>)}<button type="button" className="btn-ghost" disabled={draft.content.workflow_steps.length >= 8} onClick={() => change("workflow_steps", [...draft.content.workflow_steps, { title: "", description: "" }])}>افزودن مرحله</button></div>}
      </div>)}
      <div className="sticky bottom-0 flex items-center gap-4 rounded-xl border bg-white p-4"><button className="btn-primary">{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><span className="text-sm text-slate-500">{dirty ? "تغییرات ذخیره نشده" : ""}</span></div>
    </fieldset></form>}
  </section>;
}
