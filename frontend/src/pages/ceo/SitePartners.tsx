import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "../../api/errorMessage";
import { api } from "../../api/client";

type CompanyPartner = {
  id: number;
  name: string;
  logo_url: string;
  position: number;
  is_active: boolean;
};

const emptyPartner = { name: "", position: 1, is_active: true, logo_url: "" };


export function SitePartners() {
  const [partners, setPartners] = useState<CompanyPartner[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyPartner);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.get<CompanyPartner[]>("/ceo/site-partners/")
      .then(({ data }) => { if (active) setPartners(data); })
      .catch((failure: unknown) => { if (active) setError(errorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function selectPartner(partner?: CompanyPartner) {
    if (dirty && !window.confirm("تغییرات ذخیره نشده‌اند. از آن‌ها صرف‌نظر می‌کنید؟")) return;
    setSelectedId(partner?.id ?? null);
    setDraft(partner ?? { ...emptyPartner, position: Math.max(0, ...partners.map((item) => item.position)) + 1 });
    setFile(null);
    setFileKey((key) => key + 1);
    setDirty(false);
    setError("");
    setMessage("");
  }

  function change(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setDirty(true);
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selectedId && !file) { setError("لوگوی شرکت را انتخاب کنید."); return; }
    setSaving(true);
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("name", draft.name);
    body.append("position", String(draft.position));
    body.append("is_active", String(draft.is_active));
    if (file) body.append("logo", file);
    try {
      const { data } = selectedId
        ? await api.patch<CompanyPartner>(`/ceo/site-partners/${selectedId}/`, body)
        : await api.post<CompanyPartner>("/ceo/site-partners/", body);
      setPartners((current) => [...current.filter((item) => item.id !== data.id), data].sort((first, second) => first.position - second.position || first.id - second.id));
      setSelectedId(data.id);
      setDraft(data);
      setFile(null);
      setFileKey((key) => key + 1);
      setDirty(false);
      setMessage(data.is_active ? "ذخیره شد. لوگو با تازه‌سازی صفحهٔ اصلی نمایش داده می‌شود." : "ذخیره شد. این شرکت در سایت نمایش داده نمی‌شود.");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">مدیریت وب‌سایت</p>
          <h1 className="mt-1 text-2xl font-bold">لوگوی شرکت‌های همکار</h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">نام، لوگو، ترتیب و نمایش شرکت‌های همکار را مدیریت کنید. بخش همکاران پس از انتشار اولین لوگو در صفحهٔ اصلی ظاهر می‌شود.</p>
        </div>
        <a className="btn-ghost" href={`${import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5174"}/#clients`} target="_blank" rel="noreferrer">مشاهده در سایت ↗</a>
      </div>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" disabled={loading || saving} onClick={() => setAttempt((value) => value + 1)} className="mr-3 underline">دریافت دوبارهٔ فهرست</button></div>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3">
          <button type="button" className="btn-primary w-full" onClick={() => selectPartner()} disabled={loading || saving}>+ افزودن شرکت همکار</button>
          {loading ? <p role="status" className="p-4 text-sm">در حال دریافت شرکت‌ها…</p> : partners.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm leading-7 text-slate-500">هنوز شرکتی اضافه نشده است. نام و لوگوی اولین شرکت را ثبت کنید.</p> : partners.map((partner) => (
            <button type="button" key={partner.id} disabled={saving} onClick={() => selectPartner(partner)} className={`flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-right transition ${selectedId === partner.id ? "border-brand-500 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-400"}`}>
              <img src={partner.logo_url} alt="" className="h-12 w-14 shrink-0 object-contain" />
              <span className="min-w-0"><span className="block break-words font-semibold">{partner.name}</span><span className="mt-2 block text-xs text-slate-500">ترتیب {partner.position.toLocaleString("fa-IR")} · {partner.is_active ? "منتشر شده" : "پنهان"}</span></span>
            </button>
          ))}
        </aside>
        <form onSubmit={save} className="card">
          <fieldset disabled={saving || loading} className="min-w-0 space-y-5">
            <h2 className="text-lg font-bold">{selectedId ? "ویرایش شرکت همکار" : "شرکت همکار جدید"}</h2>
            <label className="block"><span className="label">نام شرکت</span><input className="input" required maxLength={160} value={draft.name} onChange={(event) => change({ name: event.target.value })} /></label>
            <label className="block">
              <span className="label">لوگوی شرکت</span>
              <input key={fileKey} type="file" required={!selectedId} accept="image/png,image/jpeg" className="input" onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                if (picked && (!["image/png", "image/jpeg"].includes(picked.type) || picked.size > 5 * 1024 * 1024)) {
                  setError("یک تصویر JPG یا PNG با حجم حداکثر ۵ مگابایت انتخاب کنید.");
                  event.target.value = "";
                  setFile(null);
                  return;
                }
                setFile(picked);
                setDirty(true);
                setError("");
                setMessage("");
              }} />
              <span className="mt-2 block text-xs leading-6 text-slate-500">PNG شفاف پیشنهاد می‌شود؛ JPG و PNG تا ۵ مگابایت. هنگام ویرایش، انتخاب نکردن فایل جدید لوگوی قبلی را حفظ می‌کند.</span>
            </label>
            {(preview || draft.logo_url) && <div className="grid min-h-44 place-items-center rounded-xl border border-slate-200 bg-white p-8"><img src={preview || draft.logo_url} alt={draft.name || "پیش‌نمایش لوگو"} className="h-28 w-full max-w-xs object-contain" /></div>}
            <label className="block"><span className="label">ترتیب نمایش</span><input className="input" type="number" required min={0} max={2147483647} value={draft.position} onChange={(event) => change({ position: Number(event.target.value) })} /></label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={draft.is_active} onChange={(event) => change({ is_active: event.target.checked })} />نمایش این شرکت در سایت عمومی</label>
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
              <button className="btn-primary" disabled={loading || saving}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button>
              <span className="text-xs text-slate-500">{dirty ? "تغییرات ذخیره نشده" : ""}</span>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
