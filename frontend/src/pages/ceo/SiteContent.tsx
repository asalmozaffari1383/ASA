import { useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "../../api/errorMessage";
import { api } from "../../api/client";

type ServiceCard = {
  id: number;
  title: string;
  description: string;
  details: string;
  applications: string;
  inspection_steps: string;
  specs: string[];
  image: string | null;
  image_url: string;
  image_alt: string;
  default_image: string;
  position: number;
  is_active: boolean;
};

const emptyCard: Omit<ServiceCard, "id"> = {
  title: "", description: "", specs: [], image: null, image_url: "",
  details: "", applications: "", inspection_steps: "",
  image_alt: "", default_image: "", position: 1, is_active: true,
};


export function SiteContent() {
  const [cards, setCards] = useState<ServiceCard[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyCard);
  const [specsText, setSpecsText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [clearImage, setClearImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get<ServiceCard[]>("/ceo/site-services/").then(({ data }) => {
      if (active) setCards(data);
    }).catch((failure: unknown) => {
      if (active) setError(errorMessage(failure));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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

  function selectCard(card?: ServiceCard) {
    if (dirty && !window.confirm("تغییرات ذخیره نشده‌اند. از آن‌ها صرف‌نظر می‌کنید؟")) return;
    setSelectedId(card?.id ?? null);
    setDraft(card ?? { ...emptyCard, position: Math.max(0, ...cards.map((item) => item.position)) + 1 });
    setSpecsText(card?.specs.join("\n") ?? "");
    setFile(null); setClearImage(false); setDirty(false);
    setFileKey((key) => key + 1); setError(""); setMessage("");
  }

  function change(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setDirty(true); setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const body = new FormData();
    body.append("title", draft.title);
    body.append("description", draft.description);
    body.append("details", draft.details);
    body.append("applications", draft.applications);
    body.append("inspection_steps", draft.inspection_steps);
    body.append("specs", JSON.stringify(specsText.split("\n").map((item) => item.trim()).filter(Boolean)));
    body.append("image_alt", draft.image_alt);
    body.append("default_image", draft.default_image);
    body.append("position", String(draft.position));
    body.append("is_active", String(draft.is_active));
    body.append("clear_image", String(clearImage));
    if (file) body.append("image", file);
    try {
      const { data } = selectedId
        ? await api.patch<ServiceCard>(`/ceo/site-services/${selectedId}/`, body)
        : await api.post<ServiceCard>("/ceo/site-services/", body);
      setCards((current) => [...current.filter((item) => item.id !== data.id), data].sort((first, second) => first.position - second.position || first.id - second.id));
      setDraft(data); setSelectedId(data.id); setSpecsText(data.specs.join("\n"));
      setFile(null); setClearImage(false); setDirty(false); setFileKey((key) => key + 1);
      setMessage(data.is_active ? "ذخیره شد. تغییرات با باز کردن یا تازه‌سازی سایت نمایش داده می‌شود." : "ذخیره شد. این کارت در سایت نمایش داده نمی‌شود.");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  }

  const displayImage = preview || (clearImage ? draft.default_image : draft.image_url);
  const publicImage = displayImage.startsWith("/images/")
    ? `${import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5174"}${displayImage}`
    : displayImage;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-slate-500">مدیریت وب‌سایت</p><h1 className="mt-1 text-2xl font-bold">کارت‌ها و صفحات خدمات</h1><p className="mt-2 text-sm leading-7 text-slate-500">اطلاعات کارت و صفحهٔ معرفی هر خدمت را بدون تغییر کد مدیریت کنید.</p></div>
        <a className="btn-ghost" href={import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5174"} target="_blank" rel="noreferrer">مشاهده سایت ↗</a>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3">
          <button type="button" className="btn-primary w-full" onClick={() => selectCard()} disabled={saving || loading}>+ افزودن خدمت جدید</button>
          {loading ? <p role="status" className="p-4 text-sm">در حال دریافت خدمات…</p> : cards.map((card) => (
            <button type="button" key={card.id} disabled={saving} onClick={() => selectCard(card)} className={`w-full rounded-xl border p-4 text-right transition ${selectedId === card.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-400"}`}>
              <span className="mb-2 flex justify-between gap-3 text-xs text-slate-500"><span>ترتیب {card.position.toLocaleString("fa-IR")}</span><span className={card.is_active ? "text-emerald-700" : "text-slate-400"}>{card.is_active ? "منتشر شده" : "پنهان"}</span></span>
              <span className="block font-semibold">{card.title}</span>
            </button>
          ))}
        </aside>
        <form onSubmit={save} className="card">
          <fieldset disabled={saving || loading} className="min-w-0 space-y-5">
          <h2 className="text-lg font-bold">{selectedId ? "ویرایش خدمت" : "خدمت جدید"}</h2>
          <label className="block"><span className="label">عنوان خدمت</span><input className="input" required maxLength={160} value={draft.title} onChange={(event) => change({ title: event.target.value })} /></label>
          <label className="block"><span className="label">توضیح کوتاه روی کارت</span><textarea className="input min-h-28" required maxLength={1200} value={draft.description} onChange={(event) => change({ description: event.target.value })} /></label>
          <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">محتوای صفحهٔ معرفی خدمت</h3>{selectedId && <a className="text-xs font-semibold text-brand-600 underline" href={`${import.meta.env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5174"}/services/${selectedId}`} target="_blank" rel="noreferrer">مشاهده صفحهٔ ذخیره‌شده ↗</a>}</div>
            <label className="block"><span className="label">شرح کامل خدمت</span><textarea className="input min-h-60" maxLength={20000} value={draft.details} onChange={(event) => change({ details: event.target.value })} /><span className="mt-2 block text-xs leading-6 text-slate-500">هر پاراگراف را با یک خط خالی جدا کنید. اگر خالی باشد توضیح کوتاه نمایش داده می‌شود.</span></label>
            <label className="block"><span className="label">دامنه و کاربردها؛ هر مورد در یک خط</span><textarea className="input min-h-28" maxLength={5000} value={draft.applications} onChange={(event) => change({ applications: event.target.value })} /></label>
            <label className="block"><span className="label">مراحل انجام خدمت؛ هر مرحله در یک خط</span><textarea className="input min-h-28" maxLength={5000} value={draft.inspection_steps} onChange={(event) => change({ inspection_steps: event.target.value })} /></label>
          </div>
          <label className="block"><span className="label">ویژگی‌ها؛ هر مورد در یک خط، حداکثر ۸ مورد</span><textarea className="input min-h-24" value={specsText} onChange={(event) => { setSpecsText(event.target.value); setDirty(true); }} /></label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="label">تصویر خدمت</span><input key={fileKey} type="file" accept="image/jpeg,image/png" className="input" onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              if (picked && (!['image/jpeg', 'image/png'].includes(picked.type) || picked.size > 5 * 1024 * 1024)) { setError("تصویر JPG یا PNG با حجم حداکثر ۵ مگابایت انتخاب کنید."); event.target.value = ""; return; }
              setFile(picked); setClearImage(false); setDirty(true); setError("");
            }} /><span className="mt-2 block text-xs leading-6 text-slate-500">JPG یا PNG تا ۵ مگابایت؛ نسبت پیشنهادی ۴ به ۳.</span></label>
            <label className="block"><span className="label">توضیح تصویر برای دسترس‌پذیری</span><input className="input" maxLength={200} value={draft.image_alt} onChange={(event) => change({ image_alt: event.target.value })} /></label>
          </div>
          {publicImage && <div className="overflow-hidden rounded-xl border border-slate-200"><img src={publicImage} alt={draft.image_alt || draft.title || "پیش‌نمایش تصویر"} className="h-56 w-full object-cover" /></div>}
          {draft.image && !file && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clearImage} onChange={(event) => { setClearImage(event.target.checked); setDirty(true); }} />حذف تصویر بارگذاری‌شده و استفاده از تصویر پیش‌فرض</label>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="label">تصویر پیش‌فرض</span><select className="input" value={draft.default_image} onChange={(event) => change({ default_image: event.target.value })}><option value="">بدون تصویر پیش‌فرض</option><option value="/images/service-boiler.jpg">ظروف تحت فشار</option><option value="/images/service-electrical.jpg">ایمنی برق</option><option value="/images/service-fire.jpg">اعلام و اطفاء حریق</option></select></label>
            <label className="block"><span className="label">ترتیب نمایش</span><input className="input" type="number" required min={0} max={2147483647} value={draft.position} onChange={(event) => change({ position: Number(event.target.value) })} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={draft.is_active} onChange={(event) => change({ is_active: event.target.checked })} />نمایش این خدمت در سایت عمومی</label>
          <div className="flex items-center gap-4 border-t border-slate-100 pt-5"><button className="btn-primary" disabled={saving || loading}>{saving ? "در حال ذخیره…" : "ذخیره تغییرات"}</button><span className="text-xs text-slate-500">{dirty ? "تغییرات ذخیره نشده" : ""}</span></div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
