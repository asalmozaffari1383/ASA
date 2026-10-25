import { useEffect, useRef, useState, type ReactNode } from "react";

import { defaultContact, fetchContact } from "../../services/contact";

function ContactIcon({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></>,
    web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    phone: <path d="M8 3H4a1 1 0 0 0-1 1c0 10 7 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3a16 16 0 0 1-7-7l3-2-2-5Z" />,
    map: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    chat: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-4.8A9 9 0 1 1 21 11.5Z" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">{paths[kind]}</svg>;
}

export function ContactButton({ children, className }: { children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState(defaultContact);
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchContact().then(data => { if (active) setContact(data); }).catch(() => {});
    return () => { active = false; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  const close = () => { dialog.current?.close(); setOpen(false); };
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">{children}</button>
    {open && <dialog ref={dialog} aria-labelledby="asa-contact-title" dir="rtl" onCancel={close} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-ink-deep/60 backdrop:backdrop-blur-sm">
      <div className="relative p-5 sm:p-8">
        <button type="button" autoFocus onClick={close} aria-label="بستن اطلاعات تماس" className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-mist text-2xl transition hover:bg-ink/10">×</button>
        <h2 id="asa-contact-title" className="pe-3 text-2xl font-bold">{contact.title}</h2>
        <p className="mt-2 description-copy text-ink">{contact.subtitle}</p>
        <div className="mt-6 rounded-2xl bg-mist p-5">
          <h3 className="font-bold text-accent-dark">{contact.services_title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink">
            {contact.services.map(service => <span key={service} className="rounded-full bg-white px-3 py-2">{service}</span>)}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {contact.links.map((link, index) => <a key={index} href={/^(https?:\/\/|mailto:|tel:)/i.test(link.href) ? link.href : undefined} target={/^https?:/.test(link.href) ? "_blank" : undefined} rel={/^https?:/.test(link.href) ? "noopener noreferrer" : undefined} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-ink/10 p-4 transition hover:border-accent-dark hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-dark">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-dark"><ContactIcon kind={link.kind} /></span>
            <span className="min-w-0"><span className="block text-xs text-steel-dark">{link.label}</span><span dir={["web", "mail", "phone", "instagram"].includes(link.kind) ? "ltr" : undefined} className="mt-1 block break-words text-sm font-bold">{link.text}</span></span>
          </a>)}
        </div>
      </div>
    </dialog>}
  </>;
}
