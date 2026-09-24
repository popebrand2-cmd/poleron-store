"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_SECTIONS } from "@/lib/collection-sections";

export type PickerDesign = { id: string; name: string; imageUrl: string; placement: "FRONT" | "BACK" };
export type PickerCollection = { id: string; name: string; category?: string; designs: PickerDesign[] };

const ALL = "Todas";
const GREEN = "#0b6b25";
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

// Signed distance on a loop, so the carousel can keep going in either direction.
function wrap(i: number, active: number, n: number) {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

// Small version of the homepage "Colecciones" carousel for the editor: a compact stack of collection
// covers (neon glow on the selected one, Instagram-style dots) and, underneath, that collection's
// designs to tap. Only transform / opacity move, so it stays light on phones.
export default function CollectionPicker({
  collections,
  selectedUrl,
  onPick,
}: {
  collections: PickerCollection[];
  selectedUrl?: string;
  onPick: (design: PickerDesign) => void;
}) {
  const [cat, setCat] = useState(ALL);
  const [active, setActive] = useState(0);
  const sx = useRef<number | null>(null);
  const moved = useRef(false);

  const sections = useMemo(() => {
    const present = new Set(collections.map((c) => c.category || "Otros"));
    const ordered = [...DEFAULT_SECTIONS.filter((s) => present.has(s)), ...[...present].filter((s) => !DEFAULT_SECTIONS.includes(s))];
    return ordered.length > 1 ? [...ordered, ALL] : [];
  }, [collections]);

  const items = useMemo(() => (cat === ALL ? collections : collections.filter((c) => (c.category || "Otros") === cat)), [collections, cat]);
  const n = items.length;
  const idx = Math.min(active, Math.max(0, n - 1));
  const current = items[idx];

  const go = (i: number) => n > 0 && setActive(((i % n) + n) % n);

  function onPointerDown(e: React.PointerEvent) {
    sx.current = e.clientX;
    moved.current = false;
    let dx = 0;
    const onMove = (ev: PointerEvent) => {
      if (sx.current === null) return;
      dx = ev.clientX - sx.current;
      if (Math.abs(dx) > 8) moved.current = true;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      sx.current = null;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      setTimeout(() => (moved.current = false), 30);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  if (n === 0 && collections.length === 0) return null;

  return (
    <div className="mt-5">
      {sections.length > 0 && (
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" style={{ scrollbarWidth: "none" }}>
          {sections.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setCat(s);
                setActive(0);
              }}
              aria-pressed={cat === s}
              className={`h-8 shrink-0 rounded-full border px-3.5 text-[11px] font-bold uppercase tracking-wider transition ${
                cat === s ? "border-[#0b6b25] bg-[#0b6b25] text-white" : "border-neutral-300 text-black hover:border-[#0b6b25]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div
        className="relative mx-auto mt-4 h-[168px] w-full max-w-md touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(idx + 1);
          if (e.key === "ArrowLeft") go(idx - 1);
        }}
      >
        {items.map((c, i) => {
          const d = wrap(i, idx, n);
          const ad = Math.abs(d);
          const shown = ad <= 2;
          const sign = d < 0 ? -1 : 1;
          const x = ad === 0 ? 0 : ad === 1 ? 0.72 : 1.2;
          const scale = ad === 0 ? 1 : ad === 1 ? 0.82 : 0.66;
          const cover = c.designs[0]?.imageUrl;
          const isAct = ad === 0;
          return (
            <button
              key={c.id}
              type="button"
              tabIndex={shown ? 0 : -1}
              aria-label={c.name}
              aria-current={isAct}
              onClick={() => {
                if (!moved.current && !isAct) go(i);
              }}
              className="absolute left-1/2 top-1/2 block w-[112px] outline-none"
              style={{
                aspectRatio: "3 / 4",
                transform: `translate(-50%, -50%) translateX(${sign * x * 112}px) scale(${shown ? scale : 0.5})`,
                opacity: !shown ? 0 : ad === 0 ? 1 : ad === 1 ? 0.75 : 0.4,
                visibility: shown ? "visible" : "hidden",
                zIndex: 10 - ad,
                transition: `transform 0.55s ${EASE}, opacity 0.45s ease`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md"
                style={{
                  opacity: isAct ? 1 : 0,
                  transition: "opacity 0.6s ease",
                  boxShadow: `0 0 0 1px ${GREEN}, 0 0 12px 2px color-mix(in srgb, ${GREEN} 55%, transparent), 0 0 26px 3px color-mix(in srgb, ${GREEN} 20%, transparent)`,
                }}
              />
              <span className="absolute inset-0 overflow-hidden rounded-md bg-neutral-200">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" draggable={false} className="h-full w-full object-cover object-top" />
                )}
                <span className="absolute inset-0 bg-white" style={{ opacity: isAct ? 0 : 0.5, transition: "opacity 0.5s ease" }} />
              </span>
            </button>
          );
        })}
        {n === 0 && <p className="absolute inset-0 grid place-items-center text-xs uppercase tracking-widest text-neutral-500">Sin colecciones aquí</p>}
      </div>

      {current && (
        <div className="mt-2 text-center">
          <p className="font-display text-2xl font-bold uppercase leading-none text-black">{current.name}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
            {current.designs.length} {current.designs.length === 1 ? "diseño" : "diseños"}
          </p>
        </div>
      )}

      {n > 1 && (
        <div className="mt-3 flex items-center justify-center" role="tablist" aria-label="Ir a una colección">
          {items.map((c, i) => {
            const dist = Math.min(Math.abs(i - idx), 4);
            const size = dist === 0 ? 8 : dist === 1 ? 6 : dist === 2 ? 5 : 4;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={i === idx}
                aria-label={`Ir a ${c.name}`}
                onClick={() => go(i)}
                className="relative h-6 shrink-0"
                style={{ width: dist === 4 ? 0 : 14, opacity: dist === 4 ? 0 : 1, pointerEvents: dist === 4 ? "none" : "auto", transition: `width 0.4s ${EASE}, opacity 0.4s ease` }}
              >
                <span
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: size,
                    height: size,
                    transform: "translate(-50%, -50%)",
                    background: i === idx ? GREEN : "#00000033",
                    transition: `width 0.4s ${EASE}, height 0.4s ${EASE}, background 0.4s ease`,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <div className="scrollbar-none -mx-4 mt-4 flex snap-x justify-start gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0" style={{ scrollbarWidth: "none" }}>
          {current.designs.map((d) => {
            const selected = selectedUrl === d.imageUrl;
            return (
              <button key={d.id} type="button" onClick={() => onPick(d)} aria-pressed={selected} title={d.name} className="group w-20 shrink-0 snap-start text-left sm:w-24">
                <span
                  className={`relative block aspect-[3/4] overflow-hidden rounded-xl border-2 bg-neutral-200 transition ${
                    selected ? "border-[#0b6b25] shadow-[0_0_16px_color-mix(in_srgb,#0b6b25_40%,transparent)]" : "border-neutral-300 group-hover:border-[#0b6b25]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.imageUrl} alt={d.name} loading="lazy" className="h-full w-full object-cover object-top" />
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0b6b25] text-white" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  )}
                </span>
                {d.name.toLowerCase() !== current.name.toLowerCase() && (
                  <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-700">{d.name}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
