import { useEffect, useRef, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { FormField, controlBorder, controlClasses } from "./FormField";
import { formatJalaliDate, jalaliMonthLength, jalaliMonths, jalaliToISO, parseISODate, todayISO, toJalali } from "../../../utils/jalaliDate";

const weekDays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export function JalaliDateInput({ name, label, className }: { name: string; label: string; className?: string }) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const today = todayISO();
  const selected = typeof field.value === "string" ? field.value : "";
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => toJalali(parseISODate(selected) ?? new Date()));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const firstDate = parseISODate(jalaliToISO(view.year, view.month, 1) ?? today)!;
  const offset = (firstDate.getUTCDay() + 1) % 7;
  const days = jalaliMonthLength(view.year, view.month);
  const baseYear = toJalali(new Date()).year;
  const years = Array.from({ length: 201 }, (_, i) => baseYear - 100 + i);
  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const focusOutside = (event: FocusEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", focusOutside); };
  }, [open]);
  function choose(value: string) { field.onChange(value); field.onBlur(); setOpen(false); trigger.current?.focus(); }
  function move(delta: number) {
    const index = view.year * 12 + view.month - 1 + delta;
    setView({ year: Math.floor(index / 12), month: index % 12 + 1, day: 1 });
  }
  return <FormField htmlFor={name} label={label} hint="تقویم شمسی" error={fieldState.error?.message} className={className}>
    <div ref={root} className="relative" onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
      <button id={name} ref={node => { trigger.current = node; field.ref(node); }} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${name}-calendar` : undefined} aria-invalid={fieldState.invalid || undefined} aria-label={`${label}، ${formatJalaliDate(selected) || "انتخاب تاریخ شمسی"}`} onBlur={field.onBlur} onClick={() => { if (!open) setView(toJalali(parseISODate(selected) ?? new Date())); setOpen(!open); }} className={`${controlClasses} ${controlBorder(fieldState.invalid)} flex w-full items-center justify-between gap-3 text-right`}>
        <span dir="ltr">{formatJalaliDate(selected) || "انتخاب تاریخ شمسی"}</span><span aria-hidden="true">▦</span>
      </button>
      {open && <div id={`${name}-calendar`} ref={dialog} tabIndex={-1} role="dialog" aria-label={`تقویم شمسی ${label}`} dir="rtl" className="absolute right-0 top-full z-40 mt-2 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white p-3 text-ink shadow-xl focus:outline-none">
        <div className="mb-3 flex items-center gap-1">
          <button type="button" aria-label="ماه قبل" disabled={view.year <= years[0] && view.month === 1} onClick={() => move(-1)} className="rounded-lg px-2 py-2 hover:bg-slate-100 disabled:opacity-30">‹</button>
          <select aria-label="ماه شمسی" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm" value={view.month} onChange={event => setView({ ...view, month: Number(event.target.value) })}>{jalaliMonths.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select>
          <select aria-label="سال شمسی" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm" value={view.year} onChange={event => setView({ ...view, year: Number(event.target.value) })}>{years.map(year => <option key={year} value={year}>{year.toLocaleString("fa-IR", { useGrouping: false })}</option>)}</select>
          <button type="button" aria-label="ماه بعد" disabled={view.year >= years[years.length - 1] && view.month === 12} onClick={() => move(1)} className="rounded-lg px-2 py-2 hover:bg-slate-100 disabled:opacity-30">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {weekDays.map(day => <span key={day} title={day} className="py-1 text-xs text-slate-500">{day === "پنجشنبه" ? "پ" : day[0]}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const iso = jalaliToISO(view.year, view.month, day)!;
            const active = selected === iso;
            return <button key={day} type="button" aria-label={`${day.toLocaleString("fa-IR")} ${jalaliMonths[view.month - 1]} ${view.year.toLocaleString("fa-IR", { useGrouping: false })}`} aria-pressed={active} aria-current={today === iso ? "date" : undefined} onClick={() => choose(iso)} className={`min-h-9 rounded-lg font-semibold transition ${active ? "bg-accent-dark text-white" : "hover:bg-accent-soft"} ${today === iso && !active ? "ring-1 ring-inset ring-accent-dark" : ""}`}>{day.toLocaleString("fa-IR")}</button>;
          })}
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-sm">
          <button type="button" onClick={() => choose(today)} className="rounded-lg px-3 py-2 font-bold text-accent-dark hover:bg-accent-soft">امروز</button>
          <button type="button" onClick={() => choose("")} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">پاک کردن</button>
        </div>
      </div>}
    </div>
  </FormField>;
}
