import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export function TrackingConsole() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    navigate(trimmed ? `/track?code=${encodeURIComponent(trimmed)}` : "/track");
  }
  return <section aria-label="پیگیری سریع درخواست" className="border-b border-ink/10 bg-white px-5 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 bg-white py-7 lg:flex-row lg:items-center lg:gap-12"><div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-accent-soft text-xl text-accent-dark" aria-hidden="true">↗</span><div><h2 className="text-base font-bold text-ink">از روند درخواست خود باخبر باشید</h2><p className="mt-1.5 text-xs leading-6 text-steel-dark">کد پیگیری را وارد کنید؛ تمام مراحل، در یک نگاه.</p></div></div><form onSubmit={submit} className="flex flex-1 flex-col gap-3 sm:flex-row"><label htmlFor="tracking-code" className="sr-only">کد پیگیری</label><input id="tracking-code" dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ASA-XXXX" maxLength={40} className="min-h-12 min-w-0 flex-1 rounded-md border border-ink/15 bg-mist/50 px-5 text-center font-data text-sm tracking-widest outline-none focus:border-accent-dark" /><button type="submit" className="min-h-12 rounded-md bg-ink px-6 text-sm font-bold text-white transition hover:bg-accent-dark">پیگیری درخواست ←</button></form></div></section>;
}
