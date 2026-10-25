import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { navItems } from "../../data/siteContent";
import { useActiveSection } from "../../hooks/useActiveSection";
import { useScrolled } from "../../hooks/useScrolled";

const sectionIds = ["home", "services", "process", "about", "contact"];

export function Header() {
  const { activeId, selectSection } = useActiveSection(sectionIds);
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
    <header className={`fixed inset-x-0 top-0 z-50 bg-white border-b border-accent/20 transition-shadow ${scrolled ? "shadow-soft" : ""}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:bg-ink focus:p-3 focus:text-center focus:text-white">رفتن به محتوای اصلی</a>
      <div className="hidden bg-gradient-to-l from-ink-deep via-graphite to-accent-dark text-white/95 sm:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-6 px-8 text-lg font-bold">
          <span>مشاوران حفاظت فنی و ایمنی کار</span>
          <div className="flex items-center gap-5">
            <Link to="/track" className="transition hover:text-white">پیگیری درخواست</Link>
            <span aria-hidden="true" className="h-3 w-px bg-white/20" />
            <a href="https://ble.ir/AsaengBot" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">ارتباط با کارشناسان</a>
          </div>
        </div>
      </div>
      <nav className="mx-auto flex h-28 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-5 sm:px-8" aria-label="ناوبری اصلی">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="آسا، صفحه اصلی">
          <span className="relative block aspect-[810/480] w-[112px] overflow-hidden sm:w-[180px]">
          <img
            src="/images/asa-official-logo.jpg"
            alt="مهندسین مشاور ایمنی آسا — ارزیابی و صدور گواهی ایمنی"
            width={1050}
            height={600}
            className="absolute left-[-14.815%] top-[-11.458%] h-[125%] w-[129.63%] max-w-none contrast-[1.16] saturate-[1.12]"
            fetchPriority="high"
          />
          </span>
        </Link>
        <div className="hidden h-full items-center gap-4 lg:flex xl:gap-6">
          {navItems.map((item) => {
            const selected = location.pathname === "/" && (item.href === "#" ? "home" : item.href.slice(1)) === activeId;
            return (
              <Link
                key={item.href}
                to={item.href === "#" ? "/" : `/${item.href}`}
                onClick={(event) => {
                  if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                    selectSection(item.href === "#" ? "home" : item.href.slice(1));
                  }
                }}
                aria-current={selected ? "location" : undefined}
                className={`relative inline-flex h-full items-center text-lg font-bold transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent-dark after:transition-transform ${selected ? "font-bold text-accent-dark after:scale-x-100" : "text-steel-dark after:scale-x-0 hover:text-accent-dark hover:after:scale-x-100"}`}
              >{item.label}</Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/request-certificate" aria-current={location.pathname === "/request-certificate" ? "page" : undefined} className="inline-flex min-h-11 items-center gap-4 rounded-md border border-accent-dark bg-accent-dark px-3 text-sm font-bold text-white transition hover:border-ink hover:bg-ink sm:px-5 sm:text-lg">
            درخواست بازرسی
          </Link>
          <button ref={toggle} type="button" aria-label={menuOpen ? "بستن منو" : "باز کردن منو"} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)} className="grid h-11 w-11 place-items-center rounded-md border border-ink/15 text-xl lg:hidden">
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <nav id="mobile-menu" aria-label="منوی موبایل" className="max-h-[calc(100dvh-112px)] sm:max-h-[calc(100dvh-160px)] overflow-y-auto border-t border-ink/10 bg-white px-5 py-4 shadow-card lg:hidden">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href === "#" ? "/" : `/${item.href}`} onClick={() => { selectSection(item.href === "#" ? "home" : item.href.slice(1)); setMenuOpen(false); }} aria-current={location.pathname === "/" && (item.href === "#" ? "home" : item.href.slice(1)) === activeId ? "location" : undefined} className={`block rounded-md border-r-2 px-4 py-3 text-sm font-semibold hover:bg-mist ${location.pathname === "/" && (item.href === "#" ? "home" : item.href.slice(1)) === activeId ? "border-accent-dark bg-accent-soft text-accent-dark" : "border-transparent text-steel-dark"}`}>{item.label}</Link>
          ))}
          <Link to="/track" className="mt-2 block rounded-md bg-accent-soft px-4 py-3 text-sm font-bold text-accent-dark" onClick={() => setMenuOpen(false)}>پیگیری درخواست</Link>
        </nav>
      )}
    </header>
  );
}
