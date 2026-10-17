import { useCallback, useEffect, useState } from "react";
import {
  approvePayment,
  getSystemSettings,
  listPayments,
  rejectPayment,
  updateSystemSettings,
} from "../../api/endpoints";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { SearchBar } from "../../components/ui/SearchBar";
import { Pagination } from "../../components/ui/Pagination";
import { formatRials } from "../../lib/format";
import type { FinancialRecord } from "../../types";

export function FinancialGrid() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<FinancialRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter === "pending") params.is_approved = "false";
    if (search) params.search = search;
    if (page > 1) params.page = String(page);
    const { data } = await listPayments(params);
    setRecords(data.results);
    setCount(data.count);
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => setPage(1), [filter, search]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const act = async (id: string, kind: "approve" | "reject") => {
    setBusyId(id);
    try {
      await (kind === "approve" ? approvePayment(id) : rejectPayment(id));
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <AdvanceSettingCard />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">امور مالی</h1>
        <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
          {(["pending", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm ${filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}>
              {f === "pending" ? "در انتظار تأیید" : "همه"}
            </button>
          ))}
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="کد رهگیری، شرکت..." />

      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <p className="card text-sm text-slate-400">رکوردی یافت نشد.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{r.company_name || r.tracking_code}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{r.stage_display}</span>
              </div>
              <div className="text-sm text-slate-500">{r.tracking_code}</div>
              <div className="text-lg font-bold text-brand-700 num-fa">{formatRials(r.amount_charged)}</div>
              <button className="btn-ghost w-full text-sm" onClick={() => setPreview(r)}>مشاهده رسید</button>
              {r.is_approved ? (
                <span className="block rounded-lg bg-green-50 py-2 text-center text-sm text-green-700">تأیید شده ✓</span>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-primary flex-1 text-sm" disabled={busyId === r.id} onClick={() => act(r.id, "approve")}>تأیید</button>
                  <button className="btn-danger flex-1 text-sm" disabled={busyId === r.id} onClick={() => act(r.id, "reject")}>رد</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} count={count} onChange={setPage} />

      <Modal open={!!preview} onClose={() => setPreview(null)} title={`رسید — ${preview?.tracking_code ?? ""}`}>
        {preview && (
          <div className="space-y-3">
            <img src={preview.receipt_image} alt="رسید" className="mx-auto max-h-[70vh] rounded-lg" />
            <a
              href={preview.receipt_image}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn-primary block w-full py-2.5 text-center text-sm"
            >
              دانلود رسید
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** CEO toggle: allow inspections to proceed without the advance payment. */
function AdvanceSettingCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSystemSettings()
      .then(({ data }) => setEnabled(data.allow_inspection_without_advance))
      .catch(() => setEnabled(null));
  }, []);

  const toggle = async () => {
    if (enabled === null) return;
    const next = !enabled;
    setSaving(true);
    try {
      await updateSystemSettings({ allow_inspection_without_advance: next });
      setEnabled(next);
    } finally {
      setSaving(false);
    }
  };

  if (enabled === null) return null;

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <div className="font-bold text-slate-800">بازرسی بدون پیش‌پرداخت</div>
        <p className="text-xs text-slate-500">
          در صورت فعال بودن، رسید پیش‌پرداخت در فرم وب‌سایت اختیاری می‌شود و ادمین می‌تواند
          بازرسی را بدون تأیید پیش‌پرداخت زمان‌بندی کند.
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={enabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
            enabled ? "start-1" : "start-6"
          }`}
        />
      </button>
    </div>
  );
}
