import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { navItems } from "../../data/siteContent";
import { useActiveSection } from "../../hooks/useActiveSection";
import { useScrolled } from "../../hooks/useScrolled";
import { BrandLogo } from "../ui/BrandLogo";

const sectionIds = ["home", "services", "process", "about", "contact"];

export function Header() {
  const activeId = useActiveSection(sectionIds);
  const scrolled = useScrolled();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        toggle.current?.focus();
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menuOpen]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow ${scrolled ? "shadow-soft" : ""}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:bg-ink focus:p-3 focus:text-center focus:text-white">رفتن به محتوای اصلی</a>
      <div className="hidden bg-ink-deep text-white/75 sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-8 text-[11px]">
          <span>مشاوران حفاظت فنی و ایمنی کار</span>
          <div className="flex items-center gap-5">
            <Link to="/track" className="transition hover:text-white">پیگیری درخواست</Link>
            <span aria-hidden="true" className="h-3 w-px bg-white/20" />
            <Link to="/request-certificate" className="transition hover:text-white">ارتباط با کارشناسان</Link>
          </div>
        </div>
      </div>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8" aria-label="ناوبری اصلی">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="آسا، صفحه اصلی">
          <span className="h-12 w-12 sm:h-14 sm:w-14"><BrandLogo /></span>
          <span className="hidden sm:block">
            <span className="block font-display text-sm font-bold text-ink">ایمن سازان آرارات</span>
            <span className="mt-1 block text-[10px] tracking-[0.12em] text-steel-dark" dir="ltr">ASA ENGINEERING</span>
          </span>
        </Link>
        <div className="hidden h-full items-center gap-6 lg:flex xl:gap-8">
          {navItems.map((item) => {
            const selected = location.pathname === "/" && (item.href === "#" ? "home" : item.href.slice(1)) === activeId;
            return (
              <Link
                key={item.href}
                to={item.href === "#" ? "/" : `/${item.href}`}
                aria-current={selected ? "location" : undefined}
                className={`relative inline-flex h-full items-center text-sm transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent-dark after:transition-transform ${selected ? "font-bold text-accent-dark after:scale-x-100" : "text-steel-dark after:scale-x-0 hover:text-accent-dark hover:after:scale-x-100"}`}
              >{item.label}</Link>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/request-certificate" className="inline-flex min-h-11 items-center gap-4 rounded-md border border-ink bg-ink px-4 text-xs font-bold text-white transition hover:border-accent-dark hover:bg-accent-dark sm:px-5 sm:text-sm">
            درخواست بازرسی <span aria-hidden="true">↖</span>
          </Link>
          <button ref={toggle} type="button" aria-label={menuOpen ? "بستن منو" : "باز کردن منو"} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-md border border-ink/15 text-xl lg:hidden">
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <nav id="mobile-menu" aria-label="منوی موبایل" className="max-h-[calc(100dvh-112px)] overflow-y-auto border-t border-ink/10 bg-white px-5 py-4 shadow-card lg:hidden">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href === "#" ? "/" : `/${item.href}`} onClick={() => setMenuOpen(false)} className="block rounded-md px-4 py-3 text-sm font-semibold text-steel-dark hover:bg-mist">{item.label}</Link>
          ))}
          <Link to="/track" className="mt-2 block rounded-md bg-accent-soft px-4 py-3 text-sm font-bold text-accent-dark" onClick={() => setMenuOpen(false)}>پیگیری درخواست ←</Link>
        </nav>
      )}
    </header>
  );
}
