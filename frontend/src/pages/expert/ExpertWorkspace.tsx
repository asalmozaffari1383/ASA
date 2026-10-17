import { useCallback, useEffect, useState } from "react";
import { getExpertRequest, listScheduledRequests, submitReport } from "../../api/endpoints";
import { Toggle } from "../../components/ui/Toggle";
import { MultiImageInput } from "../../components/ui/MultiImageInput";
import { Spinner } from "../../components/ui/Spinner";
import { SearchBar } from "../../components/ui/SearchBar";
import { ScopeToggle, type Scope } from "../../components/ui/ScopeToggle";
import { Pagination } from "../../components/ui/Pagination";
import type { StaffRequestDetail, StaffRequestListItem } from "../../types";

interface ReportState {
  has_covered_space_without_alarm: boolean;
  covered_space_comment: string;
  lacks_fire_extinguishing_system: boolean;
  extinguishing_system_comment: string;
  co2_cylinders_needed: string;
  powder_gas_cylinders_needed: string;
  cylinders_comment: string;
  lease_fix_required: boolean;
  lease_fix_comment: string;
  deed_delivery_required: boolean;
  deed_delivery_comment: string;
  additional_notes: string;
  photos: File[];
}

const EMPTY: ReportState = {
  has_covered_space_without_alarm: false, covered_space_comment: "",
  lacks_fire_extinguishing_system: false, extinguishing_system_comment: "",
  co2_cylinders_needed: "0", powder_gas_cylinders_needed: "0", cylinders_comment: "",
  lease_fix_required: false, lease_fix_comment: "",
  deed_delivery_required: false, deed_delivery_comment: "",
  additional_notes: "", photos: [],
};

export function ExpertWorkspace() {
  const [list, setList] = useState<StaffRequestListItem[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("pending");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<StaffRequestListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await listScheduledRequests({ search, scope, page });
    setList(data.results);
    setCount(data.count);
    setLoading(false);
  }, [search, scope, page]);

  useEffect(() => setPage(1), [search, scope]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (active) {
    return (
      <ReportForm
        request={active}
        onCancel={() => setActive(null)}
        onSubmitted={() => {
          setActive(null);
          refresh();
        }}
      />
    );
  }

  if (detailId) {
    return <CaseDetail id={detailId} onBack={() => setDetailId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800">بازرسی‌های زمان‌بندی‌شده</h1>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="کد رهگیری، شرکت، تلفن..." />
      {loading ? (
        <Spinner label="در حال بارگذاری..." />
      ) : list.length === 0 ? (
        <p className="card text-sm text-slate-400">بازرسی فعالی وجود ندارد.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((r) => {
            const inspectable = r.status === "scheduled";
            // Already-inspected cases (under_review / completed) are viewable read-only.
            const viewable = r.status === "under_review" || r.status === "completed";
            return (
              <button
                key={r.id}
                onClick={() => (inspectable ? setActive(r) : viewable ? setDetailId(r.id) : undefined)}
                disabled={!inspectable && !viewable}
                className={`card text-start transition ${
                  inspectable || viewable ? "hover:ring-brand-300" : "cursor-default opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{r.company_name || r.tracking_code}</span>
                  <span className="text-xs text-slate-400">{r.tracking_code}</span>
                </div>
                <div className="mt-2 text-sm text-slate-500">{r.ceo_name} — {r.ceo_phone}</div>
                <span className={`mt-3 inline-block text-sm ${inspectable || viewable ? "text-brand-600" : "text-slate-400"}`}>
                  {inspectable ? "ثبت گزارش ←" : viewable ? "مشاهده جزئیات ←" : r.status_display}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Pagination page={page} count={count} onChange={setPage} />
    </div>
  );
}

function ReportForm({ request, onCancel, onSubmitted }: {
  request: StaffRequestListItem; onCancel: () => void; onSubmitted: () => void;
}) {
  const [state, setState] = useState<ReportState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof ReportState>(k: K, v: ReportState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("request", request.id);
      fd.append("has_covered_space_without_alarm", String(state.has_covered_space_without_alarm));
      if (state.has_covered_space_without_alarm) fd.append("covered_space_comment", state.covered_space_comment);
      fd.append("lacks_fire_extinguishing_system", String(state.lacks_fire_extinguishing_system));
      if (state.lacks_fire_extinguishing_system) fd.append("extinguishing_system_comment", state.extinguishing_system_comment);
      fd.append("co2_cylinders_needed", state.co2_cylinders_needed || "0");
      fd.append("powder_gas_cylinders_needed", state.powder_gas_cylinders_needed || "0");
      if (state.cylinders_comment) fd.append("cylinders_comment", state.cylinders_comment);
      fd.append("lease_fix_required", String(state.lease_fix_required));
      if (state.lease_fix_required) fd.append("lease_fix_comment", state.lease_fix_comment);
      fd.append("deed_delivery_required", String(state.deed_delivery_required));
      if (state.deed_delivery_required) fd.append("deed_delivery_comment", state.deed_delivery_comment);
      if (state.additional_notes) fd.append("additional_notes", state.additional_notes);
      state.photos.forEach((p) => fd.append("uploaded_photos", p));
      await submitReport(fd);
      onSubmitted();
    } catch {
      setError("ثبت گزارش با خطا مواجه شد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={onCancel}>→ بازگشت</button>
        <span className="text-sm text-slate-400">{request.tracking_code}</span>
      </div>
      <h1 className="text-lg font-bold text-slate-800">{request.company_name || "گزارش بازرسی"}</h1>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="card space-y-4">
        <DefectToggle
          label="فضای مسقف بدون سیستم اعلام حریق"
          on={state.has_covered_space_without_alarm}
          onToggle={(v) => set("has_covered_space_without_alarm", v)}
          comment={state.covered_space_comment}
          onComment={(v) => set("covered_space_comment", v)}
        />
        <DefectToggle
          label="فاقد سیستم اطفاء حریق"
          on={state.lacks_fire_extinguishing_system}
          onToggle={(v) => set("lacks_fire_extinguishing_system", v)}
          comment={state.extinguishing_system_comment}
          onComment={(v) => set("extinguishing_system_comment", v)}
        />

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-3 font-medium text-slate-700">کپسول‌های موردنیاز</div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="کپسول CO2" value={state.co2_cylinders_needed} onChange={(v) => set("co2_cylinders_needed", v)} />
            <NumberField label="کپسول پودر و گاز" value={state.powder_gas_cylinders_needed} onChange={(v) => set("powder_gas_cylinders_needed", v)} />
          </div>
          <input className="input mt-3" placeholder="توضیحات کپسول‌ها"
            value={state.cylinders_comment} onChange={(e) => set("cylinders_comment", e.target.value)} />
        </div>

        <DefectToggle label="نیاز به اصلاح اجاره‌نامه" on={state.lease_fix_required}
          onToggle={(v) => set("lease_fix_required", v)} comment={state.lease_fix_comment}
          onComment={(v) => set("lease_fix_comment", v)} />
        <DefectToggle label="نیاز به ارائه سند مالکیت" on={state.deed_delivery_required}
          onToggle={(v) => set("deed_delivery_required", v)} comment={state.deed_delivery_comment}
          onComment={(v) => set("deed_delivery_comment", v)} />

        <div>
          <span className="label">توضیحات تکمیلی</span>
          <textarea className="input" rows={2} value={state.additional_notes}
            onChange={(e) => set("additional_notes", e.target.value)} />
        </div>

        <MultiImageInput label="تصاویر محیطی بازرسی" files={state.photos} onChange={(f) => set("photos", f)} />
      </div>

      <button className="btn-primary w-full py-3" onClick={submit} disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت گزارش و ارسال به بررسی"}
      </button>
    </div>
  );
}

function DefectToggle({ label, on, onToggle, comment, onComment }: {
  label: string; on: boolean; onToggle: (v: boolean) => void; comment: string; onComment: (v: string) => void;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <Toggle checked={on} onChange={onToggle} label={label} />
      <div className={`grid transition-all duration-300 ${on ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <textarea className="input" rows={2} placeholder="توضیحات..." value={comment}
            onChange={(e) => onComment(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="label">{label}</span>
      <input className="input text-center" inputMode="numeric" value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} />
    </div>
  );
}

// Raised-defect flags -> label + the comment field, for the read-only report view.
const REPORT_DEFECTS = [
  { flag: "has_covered_space_without_alarm", comment: "covered_space_comment", label: "فضای مسقف بدون سیستم اعلام حریق" },
  { flag: "lacks_fire_extinguishing_system", comment: "extinguishing_system_comment", label: "فاقد سیستم اطفاء حریق" },
  { flag: "lease_fix_required", comment: "lease_fix_comment", label: "نیاز به اصلاح اجاره‌نامه" },
  { flag: "deed_delivery_required", comment: "deed_delivery_comment", label: "نیاز به ارائه سند مالکیت" },
] as const;

function CaseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<StaffRequestDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getExpertRequest(id)
      .then(({ data }) => setDetail(data))
      .catch(() => setError("بارگذاری جزئیات با خطا مواجه شد."));
  }, [id]);

  if (error) return <p className="card text-sm text-red-600">{error}</p>;
  if (!detail) return <Spinner label="در حال بارگذاری جزئیات..." />;

  const report = detail.report as Record<string, unknown> | null;
  const photos = (report?.photos as { id: string; photo: string }[] | undefined) ?? [];
  const co2 = Number(report?.co2_cylinders_needed ?? 0);
  const powder = Number(report?.powder_gas_cylinders_needed ?? 0);
  const raised = report ? REPORT_DEFECTS.filter((d) => Boolean(report[d.flag])) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={onBack}>→ بازگشت</button>
        <span className="text-sm text-slate-400">{detail.tracking_code}</span>
      </div>
      <h1 className="text-lg font-bold text-slate-800">{detail.company_name}</h1>

      <div className="card space-y-2 text-sm">
        <Info label="وضعیت" value={detail.status_display} />
        <Info label="مدیرعامل" value={String(detail.ceo_name ?? "—")} />
        <Info label="نوع فعالیت" value={String(detail.activity_type ?? "—")} />
        <Info label="آدرس" value={String(detail.address ?? "—")} />
      </div>

      {report ? (
        <div className="card space-y-4">
          <h3 className="font-bold text-slate-800">گزارش بازرسی</h3>

          {raised.length === 0 && co2 === 0 && powder === 0 ? (
            <p className="text-sm text-slate-400">نقصی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2">
              {raised.map((d) => (
                <li key={d.flag} className="rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-700">{d.label}</span>
                  {report[d.comment] ? (
                    <p className="mt-1 text-xs leading-6 text-slate-500">{String(report[d.comment])}</p>
                  ) : null}
                </li>
              ))}
              {(co2 > 0 || powder > 0) && (
                <li className="rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-medium text-slate-700">کپسول‌های موردنیاز</span>
                  <p className="mt-1 text-xs text-slate-500">
                    CO₂: {co2} — پودر و گاز: {powder}
                    {report.cylinders_comment ? ` — ${String(report.cylinders_comment)}` : ""}
                  </p>
                </li>
              )}
            </ul>
          )}

          {report.additional_notes ? (
            <div>
              <span className="label">توضیحات تکمیلی</span>
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{String(report.additional_notes)}</p>
            </div>
          ) : null}

          {photos.length > 0 && (
            <div>
              <span className="label">تصاویر بازرسی</span>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <a key={p.id} href={p.photo} target="_blank" rel="noopener noreferrer">
                    <img src={p.photo} alt="تصویر بازرسی" className="h-24 w-full rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="card text-sm text-slate-400">برای این درخواست گزارشی ثبت نشده است.</p>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-end font-medium text-slate-700">{value}</span>
    </div>
  );
}
