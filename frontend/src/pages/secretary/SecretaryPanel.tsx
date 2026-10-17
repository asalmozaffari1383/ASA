import { useCallback, useEffect, useRef, useState } from "react";
import {
  approveBaleRequest,
  checkPostalCode,
  downloadBaleFormPdf,
  getBaleRequest,
  getPreviousRequest,
  getSystemSettings,
  listBaleRequests,
  saveBaleRequest,
  scheduleWithoutAdvance,
  type SourceFilter,
} from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { ImageViewer } from "../../components/ui/ImageViewer";
import { ThreeStateSwitch } from "../../components/ui/ThreeStateSwitch";
import { Spinner } from "../../components/ui/Spinner";
import { SearchBar } from "../../components/ui/SearchBar";
import { ScopeToggle, type Scope } from "../../components/ui/ScopeToggle";
import { Pagination } from "../../components/ui/Pagination";
import { INSPECTION_TYPE_OPTIONS, OWNERSHIP_OPTIONS } from "../../lib/labels";
import type { RequestStatus, StaffRequestListItem, ThreeState } from "../../types";

type Detail = Record<string, unknown>;

// Fields never sent back in a JSON PATCH (read-only, files, or computed).
const NON_EDITABLE_KEYS = [
  "bale_form_photo", "receipt_image_url", "postal_code_document",
  "id", "tracking_code", "source", "status", "status_display",
  "request_date", "advance_paid",
];

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "bale", label: "بله" },
  { value: "website", label: "وب‌سایت" },
];

export function SecretaryPanel() {
  const { can } = useAuth();
  const canFinance = can("can_manage_financial");

  const [list, setList] = useState<StaffRequestListItem[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("pending");
  const [source, setSource] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [savedDetail, setSavedDetail] = useState("");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Whether the CEO has enabled scheduling without the advance payment.
  const [advanceAllowed, setAdvanceAllowed] = useState(false);
  useEffect(() => {
    if (!canFinance) return;
    getSystemSettings()
      .then(({ data }) => setAdvanceAllowed(data.allow_inspection_without_advance))
      .catch(() => setAdvanceAllowed(false));
  }, [canFinance]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const { data } = await listBaleRequests({ search, scope, source, page });
    setList(data.results);
    setCount(data.count);
    setLoading(false);
  }, [search, scope, source, page]);

  // Reset to the first page whenever the filters change.
  useEffect(() => setPage(1), [search, scope, source]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Postal-code state: warn (never block) when a code was used by another request.
  const initialPostal = useRef<string>("");
  const [postalWarning, setPostalWarning] = useState(false);
  const [postalDocFile, setPostalDocFile] = useState<File | null>(null);
  const [prevMsg, setPrevMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    setSavedDetail("");
    setPdfError(null);
    setPostalWarning(false);
    setPostalDocFile(null);
    setPrevMsg(null);
    getBaleRequest(selectedId, scope).then(({ data }) => {
      setDetail(data);
      setSavedDetail(JSON.stringify(data));
      initialPostal.current = (data.postal_code as string) ?? "";
    });
  }, [selectedId, scope]);

  const status = detail?.status as RequestStatus | undefined;
  const isCompleted = status === "completed";
  const isReviewIntake =
    status === "bale_photo_uploaded" || status === "pending_review";
  const readOnly = isCompleted;
  const canSchedule = status === "pending_payment" && advanceAllowed && canFinance;

  const update = (key: string, value: unknown) =>
    setDetail((d) => (d ? { ...d, [key]: value } : d));

  const checkPostal = async (value: string) => {
    if (!value || value === initialPostal.current) {
      setPostalWarning(false);
      return;
    }
    try {
      const { data } = await checkPostalCode(value);
      setPostalWarning(data.exists);
    } catch {
      setPostalWarning(false);
    }
  };

  const loadPrevious = async () => {
    if (!detail) return;
    const phone = (detail.ceo_phone as string) ?? "";
    if (!phone) {
      setPrevMsg("ابتدا شماره موبایل مدیرعامل را وارد کنید.");
      return;
    }
    setPrevMsg(null);
    try {
      const { data } = await getPreviousRequest(phone, detail.id as string);
      if (data.found) {
        setDetail((d) => (d ? { ...d, ...data.data } : d));
        setPrevMsg("اطلاعات آخرین درخواست این شماره بارگذاری شد.");
      }
    } catch {
      setPrevMsg("سابقه‌ای برای این شماره یافت نشد.");
    }
  };

  const persistEdits = async () => {
    if (!selectedId || !detail) return;
    const editable = Object.fromEntries(
      Object.entries(detail).filter(([k]) => !NON_EDITABLE_KEYS.includes(k)),
    );
    await saveBaleRequest(selectedId, editable);
    if (postalDocFile) {
      const fd = new FormData();
      fd.append("postal_code_document", postalDocFile);
      await saveBaleRequest(selectedId, fd);
    }
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      await persistEdits();
      await approveBaleRequest(selectedId!);
      setSelectedId(null);
      setDetail(null);
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await persistEdits();
      const { data } = await getBaleRequest(selectedId!, scope);
      setDetail(data);
      setSavedDetail(JSON.stringify(data));
      setPostalDocFile(null);
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async () => {
    setBusy(true);
    try {
      await scheduleWithoutAdvance(selectedId!);
      setSelectedId(null);
      setDetail(null);
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  const [pdfBusy, setPdfBusy] = useState<"download" | "print" | null>(null);
  const printIframe = useRef<HTMLIFrameElement | null>(null);
  const printUrl = useRef<string | null>(null);
  const hasUnsavedEdits = !!detail && (JSON.stringify(detail) !== savedDetail || !!postalDocFile);

  useEffect(() => () => {
    printIframe.current?.remove();
    if (printUrl.current) URL.revokeObjectURL(printUrl.current);
  }, []);

  const getFormPdf = async () => {
    if (hasUnsavedEdits) throw new Error("ابتدا تغییرات فرم را ذخیره کنید، سپس دانلود یا چاپ کنید.");
    const { data } = await downloadBaleFormPdf(selectedId!, scope);
    if (!(data instanceof Blob) || await data.slice(0, 5).text() !== "%PDF-") {
      throw new Error("فایل فرم معتبر نیست. لطفاً دوباره تلاش کنید.");
    }
    return new Blob([data], { type: "application/pdf" });
  };

  const downloadCompletedForm = async () => {
    if (!selectedId || !detail) return;
    setPdfBusy("download");
    setPdfError(null);
    try {
      const data = await getFormPdf();
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `form-${(detail.tracking_code as string) ?? "request"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setPdfError(error instanceof Error && !('response' in error) ? error.message : "دریافت فرم انجام نشد. دوباره تلاش کنید.");
    } finally {
      setPdfBusy(null);
    }
  };

  const printForm = async () => {
    if (!selectedId) return;
    setPdfBusy("print");
    setPdfError(null);
    try {
      const data = await getFormPdf();
      const url = URL.createObjectURL(data);
      printIframe.current?.remove();
      if (printUrl.current) URL.revokeObjectURL(printUrl.current);
      printUrl.current = url;
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          setPdfError("چاپ خودکار در دسترس نیست؛ فرم را دانلود و از نمایشگر PDF چاپ کنید.");
        }
      };
      document.body.appendChild(iframe);
      printIframe.current = iframe;
    } catch (error) {
      setPdfError(error instanceof Error && !('response' in error) ? error.message : "دریافت فرم برای چاپ انجام نشد. دوباره تلاش کنید.");
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      {/* Queue */}
      <aside className="card max-h-[80vh] overflow-auto">
        <h2 className="mb-3 font-bold text-slate-800">درخواست‌ها</h2>
        <div className="mb-3 space-y-2">
          <SearchBar value={search} onChange={setSearch} placeholder="کد رهگیری، شرکت، تلفن..." />
          <ScopeToggle value={scope} onChange={setScope} />
          <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
            {SOURCE_FILTERS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                className={`px-3 py-1.5 text-sm ${
                  source === s.value ? "bg-brand-600 text-white" : "bg-white text-slate-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <Spinner label="در حال بارگذاری..." />
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-400">درخواستی یافت نشد.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-xl p-3 text-start text-sm ring-1 transition ${
                    selectedId === r.id ? "bg-brand-50 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">{r.tracking_code}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {r.source === "website" ? "وب‌سایت" : "بله"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{r.company_name || r.ceo_phone}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{r.status_display}</span>
                    {r.advance_paid && (
                      <span className="text-[10px] text-green-600">پیش‌پرداخت ✓</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} count={count} onChange={setPage} />
      </aside>

      {/* Split-screen workspace */}
      {selectedId && detail ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card space-y-3">
            <ImageViewer
              tabs={[
                { key: "form", label: "فرم دستی", url: (detail.bale_form_photo as string) ?? null },
                { key: "receipt", label: "رسید پرداخت", url: (detail.receipt_image_url as string) ?? null },
              ]}
            />
            {detail.bale_form_photo ? (
              <a
                href={detail.bale_form_photo as string}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="btn-ghost block w-full py-2 text-center text-sm"
              >
                دانلود فرم ارسالی کاربر
              </a>
            ) : null}
          </div>
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                {readOnly ? "مشاهده اطلاعات فرم" : isReviewIntake ? "بررسی و ثبت فرم" : "ویرایش اطلاعات فرم"}
              </h3>
              {!readOnly && (detail.inspection_type as string) === "periodic" && (
                <button className="btn-ghost px-3 py-1 text-xs" onClick={loadPrevious}>
                  بارگذاری اطلاعات قبلی
                </button>
              )}
            </div>
            {prevMsg && <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">{prevMsg}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="نام شرکت" v={detail} k="company_name" on={update} ro={readOnly} />
              <Text label="نام مدیرعامل" v={detail} k="ceo_name" on={update} ro={readOnly} />
              <Text label="موبایل مدیرعامل" v={detail} k="ceo_phone" on={update} numeric ro={readOnly} />
              <Text label="تلفن پشتیبان" v={detail} k="backup_phone" on={update} numeric ro={readOnly} />
              <Text label="نوع فعالیت" v={detail} k="activity_type" on={update} ro={readOnly} />
              <Text label="نام معرف" v={detail} k="referrer_name" on={update} ro={readOnly} />
              <div>
                <span className="label">کد پستی</span>
                <input
                  className="input"
                  inputMode="numeric"
                  disabled={readOnly}
                  value={(detail.postal_code as string) ?? ""}
                  onChange={(e) => update("postal_code", e.target.value.replace(/\D/g, ""))}
                  onBlur={(e) => checkPostal(e.target.value)}
                />
                {postalWarning && (
                  <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                    این کد پستی قبلاً استفاده شده است. آیا مطمئن هستید؟
                  </p>
                )}
              </div>
              <Text label="مساحت زمین" v={detail} k="total_area_land" on={update} numeric ro={readOnly} />
              <Text label="مساحت بنا" v={detail} k="total_area_building" on={update} numeric ro={readOnly} />
            </div>
            <div>
              <span className="label">آدرس</span>
              <textarea className="input" rows={2} disabled={readOnly} value={(detail.address as string) ?? ""}
                onChange={(e) => update("address", e.target.value)} />
            </div>
            <div>
              <span className="label">سند تأیید کد پستی</span>
              {detail.postal_code_document ? (
                <a
                  href={detail.postal_code_document as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost mb-1 block w-full py-1.5 text-center text-xs"
                >
                  مشاهده سند فعلی
                </a>
              ) : (
                <p className="mb-1 text-xs text-slate-400">سندی بارگذاری نشده است.</p>
              )}
              {!readOnly && (
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setPostalDocFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-500 file:me-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="نوع مالکیت" v={detail} k="ownership_type" options={OWNERSHIP_OPTIONS} on={update} ro={readOnly} />
              <Select label="نوع بازرسی" v={detail} k="inspection_type" options={INSPECTION_TYPE_OPTIONS} on={update} ro={readOnly} />
            </div>
            <div className="space-y-3 rounded-xl bg-slate-50 p-3">
              <ThreeStateSwitch label="سیستم اطفاء حریق" value={detail.has_fire_extinguisher_system as ThreeState}
                onChange={(v) => update("has_fire_extinguisher_system", v)} disabled={readOnly} />
              {detail.has_fire_extinguisher_system === true && (
                <DetailField label="جزئیات سیستم اطفاء حریق" v={detail} k="fire_extinguisher_details" on={update} ro={readOnly} />
              )}
              <ThreeStateSwitch label="سیستم اعلام حریق" value={detail.has_fire_alarm_system as ThreeState}
                onChange={(v) => update("has_fire_alarm_system", v)} disabled={readOnly} />
              {detail.has_fire_alarm_system === true && (
                <DetailField label="جزئیات سیستم اعلام حریق" v={detail} k="fire_alarm_details" on={update} ro={readOnly} />
              )}
              <ThreeStateSwitch label="سیستم ارتینگ" value={detail.has_earthing_system as ThreeState}
                onChange={(v) => update("has_earthing_system", v)} disabled={readOnly} />
              {detail.has_earthing_system === true && (
                <Text label="سال احداث سیستم ارتینگ" v={detail} k="earthing_year" on={update} numeric ro={readOnly} />
              )}
            </div>

            {isReviewIntake ? (
              <button className="btn-primary w-full py-2.5" onClick={handleApprove} disabled={busy}>
                {busy ? "در حال ثبت..." : "تأیید و ثبت نهایی"}
              </button>
            ) : isCompleted ? (
              <p className="rounded-xl bg-slate-50 py-2.5 text-center text-sm text-slate-400">
                این درخواست تکمیل شده و قابل ویرایش نیست.
              </p>
            ) : (
              <button className="btn-primary w-full py-2.5" onClick={handleSave} disabled={busy}>
                {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            )}

            {canSchedule && (
              <button className="btn-ghost w-full py-2.5 text-sm" onClick={handleSchedule} disabled={busy}>
                زمان‌بندی بدون پیش‌پرداخت
              </button>
            )}

            <p className="text-xs leading-6 text-slate-500">
              {hasUnsavedEdits ? "برای دریافت فرم به‌روز، ابتدا تغییرات را ذخیره کنید." : "فایل PDF و نسخه چاپی شامل آخرین اطلاعات ذخیره‌شده درخواست هستند."}
            </p>
            {pdfError && <p role="alert" className="text-sm text-red-600">{pdfError}</p>}
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1 py-2.5 text-sm"
                onClick={downloadCompletedForm}
                disabled={pdfBusy !== null || busy || hasUnsavedEdits}
              >
                {pdfBusy === "download" ? "در حال آماده‌سازی..." : "دانلود فرم (PDF)"}
              </button>
              <button
                className="btn-ghost flex-1 py-2.5 text-sm"
                onClick={printForm}
                disabled={pdfBusy !== null || busy || hasUnsavedEdits}
              >
                {pdfBusy === "print" ? "در حال آماده‌سازی..." : "چاپ فرم"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card grid place-items-center text-slate-400">
          یک درخواست را از فهرست انتخاب کنید.
        </div>
      )}
    </div>
  );
}

function Text({ label, v, k, on, numeric, ro }: { label: string; v: Detail; k: string; on: (k: string, val: unknown) => void; numeric?: boolean; ro?: boolean }) {
  return (
    <div>
      <span className="label">{label}</span>
      <input className="input" inputMode={numeric ? "numeric" : undefined} disabled={ro}
        value={(v[k] as string | number | null) ?? ""}
        onChange={(e) => on(k, numeric ? e.target.value.replace(/\D/g, "") : e.target.value)} />
    </div>
  );
}

function DetailField({ label, v, k, on, ro }: { label: string; v: Detail; k: string; on: (k: string, val: unknown) => void; ro?: boolean }) {
  return (
    <div>
      <span className="label">{label}</span>
      <textarea className="input" rows={2} disabled={ro} value={(v[k] as string) ?? ""}
        onChange={(e) => on(k, e.target.value)} />
    </div>
  );
}

function Select({ label, v, k, options, on, ro }: { label: string; v: Detail; k: string; options: { value: string; label: string }[]; on: (k: string, val: unknown) => void; ro?: boolean }) {
  return (
    <div>
      <span className="label">{label}</span>
      <select className="input" disabled={ro} value={(v[k] as string) ?? ""} onChange={(e) => on(k, e.target.value)}>
        <option value="" disabled>انتخاب کنید</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
