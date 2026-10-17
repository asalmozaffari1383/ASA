import { useCallback, useEffect, useState } from "react";
import {
  getCertificateReadiness,
  getCertificateRequest,
  issueCertificate,
  listUnderReview,
  updateDefects,
} from "../../api/endpoints";
import { Toggle } from "../../components/ui/Toggle";
import { Tooltip } from "../../components/ui/Tooltip";
import { Spinner } from "../../components/ui/Spinner";
import { SearchBar } from "../../components/ui/SearchBar";
import { ScopeToggle, type Scope } from "../../components/ui/ScopeToggle";
import { Pagination } from "../../components/ui/Pagination";
import type {
  CertificateReadiness,
  StaffRequestDetail,
  StaffRequestListItem,
} from "../../types";

// Each defect: the report flag that means "raised", the writable "fixed" flag, and a label.
const DEFECTS = [
  { raised: "has_covered_space_without_alarm", fixed: "is_alarm_fixed", label: "اعلام حریق فضای مسقف" },
  { raised: "lacks_fire_extinguishing_system", fixed: "is_extinguishing_fixed", label: "سیستم اطفاء حریق" },
  { raised: "__cylinders__", fixed: "is_cylinders_fixed", label: "کپسول‌های اطفاء حریق" },
  { raised: "lease_fix_required", fixed: "is_lease_fixed", label: "اصلاح اجاره‌نامه" },
  { raised: "deed_delivery_required", fixed: "is_deed_fixed", label: "ارائه سند مالکیت" },
] as const;

function isRaised(report: Record<string, unknown>, raisedKey: string): boolean {
  if (raisedKey === "__cylinders__") {
    return Number(report.co2_cylinders_needed) > 0 || Number(report.powder_gas_cylinders_needed) > 0;
  }
  return Boolean(report[raisedKey]);
}

export function CertificateCenter() {
  const [list, setList] = useState<StaffRequestListItem[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("pending");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshList = useCallback(async () => {
    setLoading(true);
    const { data } = await listUnderReview({ search, scope, page });
    setList(data.results);
    setCount(data.count);
    setLoading(false);
  }, [search, scope, page]);

  useEffect(() => setPage(1), [search, scope]);
  useEffect(() => {
    refreshList();
  }, [refreshList]);

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <aside className="card max-h-[80vh] overflow-auto">
        <h2 className="mb-3 font-bold text-slate-800">درخواست‌های در حال بررسی</h2>
        <div className="mb-3 space-y-2">
          <SearchBar value={search} onChange={setSearch} placeholder="کد رهگیری، شرکت، تلفن..." />
          <ScopeToggle value={scope} onChange={setScope} />
        </div>
        {loading ? (
          <Spinner label="در حال بارگذاری..." />
        ) : list.length === 0 ? (
          <p className="text-sm text-slate-400">موردی یافت نشد.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-xl p-3 text-start text-sm ring-1 transition ${
                    selectedId === r.id ? "bg-brand-50 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
                  }`}>
                  <div className="font-semibold text-slate-700">{r.company_name || r.tracking_code}</div>
                  <div className="text-xs text-slate-400">{r.tracking_code}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{r.status_display}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} count={count} onChange={setPage} />
      </aside>

      {selectedId ? (
        <RequestDetail key={selectedId} id={selectedId} scope={scope} onCompleted={() => { setSelectedId(null); refreshList(); }} />
      ) : (
        <div className="card grid place-items-center text-slate-400">یک درخواست را انتخاب کنید.</div>
      )}
    </div>
  );
}

function RequestDetail({ id, scope, onCompleted }: { id: string; scope: Scope; onCompleted: () => void }) {
  const [detail, setDetail] = useState<StaffRequestDetail | null>(null);
  const [readiness, setReadiness] = useState<CertificateReadiness | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [d, r] = await Promise.all([
      getCertificateRequest(id, scope),
      getCertificateReadiness(id, scope),
    ]);
    setDetail(d.data);
    setReadiness(r.data);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!detail) return <Spinner />;
  const report = detail.report as Record<string, unknown> | null;
  const raisedDefects = report ? DEFECTS.filter((d) => isRaised(report, d.raised)) : [];
  // Already-issued requests (visible under "همه") are read-only here.
  const isIssued = detail.status === "completed";

  const toggleFixed = async (fixedField: string, value: boolean) => {
    // Optimistic; re-derive readiness from the server afterwards.
    setDetail((prev) => prev && ({ ...prev, report: { ...(prev.report as object), [fixedField]: value } as StaffRequestDetail["report"] }));
    await updateDefects(id, { [fixedField]: value });
    const { data } = await getCertificateReadiness(id, scope);
    setReadiness(data);
  };

  const stage2 = detail.payments.find((p) => p.stage === "stage_2");

  const onIssue = async () => {
    // Soft check: if the stage-2 receipt isn't approved, confirm before forcing.
    let force = false;
    if (readiness && !readiness.payment_approved) {
      const ok = window.confirm(
        "رسید تسویه نهایی هنوز تأیید نشده است. آیا از صدور گواهی‌نامه مطمئن هستید؟",
      );
      if (!ok) return;
      force = true;
    }
    setBusy(true);
    try {
      const { data } = await issueCertificate(id, force);
      if (data.certificate_url) window.open(data.certificate_url, "_blank");
      onCompleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-800">{detail.company_name}</h2>
          <span className="text-sm text-slate-400">{detail.tracking_code}</span>
        </div>
      </div>

      {/* Defect verification */}
      <div className="card">
        <h3 className="mb-4 font-bold text-slate-800">بررسی و تأیید رفع نواقص</h3>
        {raisedDefects.length === 0 ? (
          <p className="text-sm text-slate-400">نقصی برای این درخواست ثبت نشده است.</p>
        ) : (
          <ul className="space-y-3">
            {raisedDefects.map((d) => {
              const fixed = Boolean(report?.[d.fixed]);
              return (
                <li key={d.fixed} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className={`text-sm ${fixed ? "text-green-700" : "text-slate-700"}`}>
                    {fixed ? "✓ " : ""}{d.label}
                  </span>
                  <Toggle checked={fixed} onChange={(v) => toggleFixed(d.fixed, v)} disabled={isIssued} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Financial state */}
      <div className="card flex items-center justify-between">
        <span className="text-sm text-slate-600">تسویه نهایی (مرحله ۲)</span>
        <span className={`rounded-full px-3 py-1 text-sm ${
          stage2?.is_approved ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
        }`}>
          {stage2 ? (stage2.is_approved ? "تأیید شده" : "در انتظار تأیید") : "ثبت نشده"}
        </span>
      </div>

      {/* Certificate guardrail */}
      {isIssued ? (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
            ✓ گواهی‌نامه صادر شده
          </span>
          {detail.certificate_url ? (
            <a
              href={detail.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn-primary px-6 py-2.5 text-sm"
            >
              دانلود گواهی‌نامه
            </a>
          ) : (
            <span className="text-sm text-slate-400">فایل گواهی‌نامه در دسترس نیست.</span>
          )}
        </div>
      ) : (
        <div className="card flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {readiness?.can_issue
              ? "تمام شرایط صدور گواهی‌نامه فراهم است."
              : readiness?.can_force
                ? "رسید تسویه تأیید نشده؛ صدور با تأیید شما ممکن است."
                : "برای فعال شدن دکمه، موارد معلق را تکمیل کنید."}
          </div>
          <Tooltip
            content={
              readiness && !readiness.can_force && readiness.blocking_reasons.length > 0 ? (
                <ul className="space-y-1 text-start">
                  {readiness.blocking_reasons.map((r) => <li key={r}>• {r}</li>)}
                </ul>
              ) : null
            }
          >
            <button
              className="btn-primary px-6 py-2.5"
              disabled={!readiness?.can_force || busy}
              onClick={onIssue}
            >
              {busy ? "در حال صدور..." : "صدور گواهی‌نامه"}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
