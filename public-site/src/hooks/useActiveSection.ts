import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/** Keep the menu in sync with navigation, fixed-header offsets and manual scroll. */
export function useActiveSection(sectionIds: string[]) {
  const { pathname, hash } = useLocation();
  const [activeId, setActiveId] = useState("");
  const pending = useRef<{ id: string; until: number } | null>(null);

  const selectSection = useCallback((id: string) => {
    pending.current = { id, until: performance.now() + 2000 };
    setActiveId(id);
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      pending.current = null;
      setActiveId("");
      return;
    }
    const target = hash.slice(1) || sectionIds[0];
    if (sectionIds.includes(target)) selectSection(target);
    let frame = 0;
    function update() {
      frame = 0;
      const elements = sectionIds.map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element !== null);
      if (!elements.length) { setActiveId(""); return; }
      const headerBottom = document.querySelector('header nav[aria-label="ناوبری اصلی"]')?.getBoundingClientRect().bottom ?? 0;
      const scrollOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || headerBottom + 16;
      const line = Math.max(headerBottom + 32, scrollOffset + 8);
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 3;
      const requested = pending.current;
      if (requested && performance.now() < requested.until) {
        const element = document.getElementById(requested.id);
        if (element) {
          setActiveId(requested.id);
          const top = element.getBoundingClientRect().top;
          if (Math.abs(top - scrollOffset) <= 5 || (atBottom && top >= headerBottom) || (requested.id === sectionIds[0] && window.scrollY <= 3)) {
            pending.current = null;
          } else {
            frame = requestAnimationFrame(update);
          }
          return;
        }
      }
      pending.current = null;
      const current = atBottom ? elements[elements.length - 1]
        : [...elements].reverse().find((element) => element.getBoundingClientRect().top <= line) ?? elements[0];
      setActiveId(current.id);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    function cancelNavigation() { pending.current = null; schedule(); }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", cancelNavigation, { passive: true });
    window.addEventListener("touchstart", cancelNavigation, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", cancelNavigation);
      window.removeEventListener("touchstart", cancelNavigation);
    };
  }, [sectionIds, pathname, hash, selectSection]);

  return { activeId, selectSection };
}
