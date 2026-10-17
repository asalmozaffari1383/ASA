import { useRef, useState } from "react";

interface Tab {
  key: string;
  label: string;
  url: string | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.25;

const clampZoom = (z: number) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);

/** Tabbed image viewer with zoom (buttons + wheel), drag-to-pan and rotate. */
export function ImageViewer({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const current = tabs.find((t) => t.key === active);
  const reset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!current?.url) return;
    e.preventDefault();
    setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1 || !current?.url) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActive(t.key);
                reset();
              }}
              className={`px-4 py-1.5 text-sm ${
                active === t.key ? "bg-brand-600 text-white" : "bg-white text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost px-2 py-1" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}>＋</button>
          <button className="btn-ghost px-2 py-1" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}>－</button>
          <button className="btn-ghost px-2 py-1" onClick={() => setRotation((r) => r + 90)}>⟳</button>
          <button className="btn-ghost px-2 py-1" onClick={reset}>بازنشانی</button>
          {current?.url && (
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn-ghost px-2 py-1"
              title={`دانلود ${current.label}`}
            >
              ⬇
            </a>
          )}
        </div>
      </div>
      <div
        className="relative flex-1 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
        onWheel={onWheel}
      >
        <div className="flex min-h-[24rem] items-center justify-center p-4">
          {current?.url ? (
            <img
              src={current.url}
              alt={current.label}
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                cursor: zoom > 1 ? (drag.current ? "grabbing" : "grab") : "default",
              }}
              className="max-h-full origin-center select-none transition-transform duration-150"
            />
          ) : (
            <span className="text-sm text-slate-400">تصویری موجود نیست</span>
          )}
        </div>
      </div>
    </div>
  );
}
