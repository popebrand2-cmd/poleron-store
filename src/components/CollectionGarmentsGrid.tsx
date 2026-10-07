"use client";

import { useEffect, useRef, useState } from "react";
import CollectionGarmentCard, { type GarmentColor } from "@/components/CollectionGarmentCard";

export type GarmentKind = "polera" | "poleron" | "boxy";
export type GarmentItem = {
  key: string;
  kind: GarmentKind;
  href: string;
  // The same garment with nothing printed on it ("+ Personalizar").
  blankHref?: string;
  // The collection it belongs to (the "all collections" page filters on it).
  collectionId?: string;
  collectionName?: string;
  // The artist/collection it belongs to (Karol G, Streetwear, BTS…), one level above the design.
  groupId?: string;
  groupName?: string;
  title: string;
  description?: string;
  badge?: string;
  frontArt?: string;
  backArt?: string;
  frontScale?: number;
  backScale?: number;
  basePrice: number | null;
  compareAtPrice: number | null;
  colors: GarmentColor[];
};

const KIND_LABEL: Record<GarmentKind, string> = { polera: "Polera", poleron: "Polerón oversize", boxy: "Boxifit" };
const KIND_ORDER: GarmentKind[] = ["polera", "poleron", "boxy"];

// Garment type picker over the collection's ready-made pieces. Only types that actually exist in the
// catalog get a tab, so there is never an empty option.
export default function CollectionGarmentsGrid({
  items,
  compact = false,
  light = false,
  defaultColor = "",
}: {
  items: GarmentItem[];
  // Homepage layout: no color filter, a swipeable row on phones and tablets, a 4-column grid on desktop.
  compact?: boolean;
  // White page: dark text and tabs. `defaultColor`: the color every card opens on (when it has it), e.g. "Blanco".
  light?: boolean;
  defaultColor?: string;
}) {
  const kinds = KIND_ORDER.filter((k) => items.some((i) => i.kind === k));
  const [active, setActive] = useState<GarmentKind | "all">("all");
  const [colorName, setColorName] = useState("");
  // One chip per color name found in the collection (Negro, Blanco…), with its swatch.
  const colorChoices = [...new Map(items.flatMap((i) => i.colors).map((c) => [c.name, c.hex])).entries()];
  // Homepage rail: the row never stops. It glides on its own, forever (the cards are repeated once so there is no end),
  // slows down under the mouse so a card can be clicked, and can be dragged, flicked, wheeled or moved with the arrows.
  // It is moved with a transform (sub-pixel, no scrolling), one frame at a time, so it stays smooth at 60 fps.
  const view = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const shown = items.filter((i) => (active === "all" || i.kind === active) && (!colorName || i.colors.some((c) => c.name === colorName)));
  const loops = compact && shown.length > 1;
  const [inView, setInView] = useState(false);
  // Shared with the animation loop below.
  const motion = useRef({ x: 0, target: null as number | null, v: 0, pausedUntil: 0 });
  const touched = (ms = 1500) => {
    motion.current.pausedUntil = Date.now() + ms;
  };
  useEffect(() => {
    const el = view.current;
    if (!compact || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, [compact]);
  const SPEED = 110; // px per second (the reference video glides at about this pace)
  const strideOf = () => {
    const cards = rail.current?.querySelectorAll("li");
    return cards && cards.length > 1 ? (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft : 0;
  };
  useEffect(() => {
    const m = motion.current;
    m.x = 0;
    m.target = null;
    m.v = 0;
    const el = rail.current;
    if (el) el.style.transform = "translate3d(0,0,0)";
  }, [active, colorName]);
  useEffect(() => {
    const view_ = view.current;
    const el = rail.current;
    if (!loops || !view_ || !el || !inView) return;
    const m = motion.current;
    let period = 0;
    const measure = () => {
      const cards = el.querySelectorAll("li");
      const half = cards.length / 2;
      period = half >= 1 && cards[half] ? (cards[half] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft : 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let hover = false;
    let factor = 1;
    let drag: { id: number; startX: number; startPos: number; on: boolean; lastX: number; lastT: number; v: number } | null = null;
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = false;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = { id: e.pointerId, startX: e.clientX, startPos: m.x, on: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
      m.target = null;
      m.v = 0;
      touched(60000);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.on && Math.abs(dx) > 6) {
        drag.on = true;
        // Capture only once it is really a drag, so a plain click on a card still reaches its link.
        try {
          view_.setPointerCapture(e.pointerId);
        } catch {}
      }
      if (!drag.on) return;
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT) / 1000;
      drag.v = drag.v * 0.6 + (-(e.clientX - drag.lastX) / dt) * 0.4;
      drag.lastX = e.clientX;
      drag.lastT = now;
      m.x = drag.startPos - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.on) {
        // Flick: keep going with the speed of the finger, slowing down.
        m.v = Math.abs(drag.v) > 80 && performance.now() - drag.lastT < 120 ? drag.v : 0;
        view_.dataset.dragged = "1";
        setTimeout(() => delete view_.dataset.dragged, 60);
        try {
          view_.releasePointerCapture(e.pointerId);
        } catch {}
      }
      drag = null;
      touched(1500);
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) {
        m.x += e.deltaX;
        m.target = null;
        touched(1500);
      }
    };
    const onFocus = () => touched(4000);
    const onScroll = () => {
      // The browser scrolls this clipped box to reveal a focused card: undo it, the transform does the moving.
      view_.scrollLeft = 0;
    };
    view_.addEventListener("pointerenter", onEnter);
    view_.addEventListener("pointerleave", onLeave);
    view_.addEventListener("pointerdown", onDown);
    view_.addEventListener("pointermove", onMove);
    view_.addEventListener("pointerup", onUp);
    view_.addEventListener("pointercancel", onUp);
    view_.addEventListener("wheel", onWheel, { passive: true });
    view_.addEventListener("focusin", onFocus);
    view_.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden || !period) return;
      if (drag?.on) {
        // The finger moves it (onMove).
      } else if (m.target !== null) {
        const diff = m.target - m.x;
        m.x += diff * Math.min(1, dt * 9);
        if (Math.abs(diff) < 0.5) {
          m.x = m.target;
          m.target = null;
        }
      } else if (Math.abs(m.v) > 20) {
        m.x += m.v * dt;
        m.v *= Math.exp(-dt * 3.2);
        touched(900);
      } else if (!drag && Date.now() >= m.pausedUntil) {
        factor += ((hover ? 0.25 : 1) - factor) * Math.min(1, dt * 6);
        m.x += SPEED * factor * dt;
      }
      // Loop: the second copy is identical to the first, so jumping a whole period back is invisible.
      while (m.x >= period) {
        m.x -= period;
        if (m.target !== null) m.target -= period;
        if (drag) drag.startPos -= period;
      }
      while (m.x < 0) {
        m.x += period;
        if (m.target !== null) m.target += period;
        if (drag) drag.startPos += period;
      }
      el.style.transform = `translate3d(${-m.x}px,0,0)`;
      if (thumb.current) thumb.current.style.transform = `translate3d(${(m.x / period) * 455}%,0,0)`;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      view_.removeEventListener("pointerenter", onEnter);
      view_.removeEventListener("pointerleave", onLeave);
      view_.removeEventListener("pointerdown", onDown);
      view_.removeEventListener("pointermove", onMove);
      view_.removeEventListener("pointerup", onUp);
      view_.removeEventListener("pointercancel", onUp);
      view_.removeEventListener("wheel", onWheel);
      view_.removeEventListener("focusin", onFocus);
      view_.removeEventListener("scroll", onScroll);
    };
  }, [loops, inView, active, colorName]);
  const slide = (dir: 1 | -1) => {
    const m = motion.current;
    const step = strideOf() * (window.innerWidth >= 1024 ? 2 : 1);
    if (!step) return;
    m.v = 0;
    m.target = (m.target ?? m.x) + dir * step;
    touched(2500);
  };

  return (
    <>
      {!compact && colorChoices.length > 1 && (
        <div role="group" aria-label="Color" className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Color</span>
          {[["", ""] as const, ...colorChoices].map(([name, hex]) => {
            const on = colorName === name;
            return (
              <button
                key={name || "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setColorName(name)}
                className={`inline-flex min-h-9 items-center gap-2 rounded-full border-2 px-4 text-xs font-bold uppercase tracking-wide transition ${
                  on ? "border-neon bg-neon text-black" : "border-white/25 text-white hover:border-neon hover:text-neon"
                }`}
              >
                {name && <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-white/50" style={{ backgroundColor: hex }} />}
                {name || "Todos"}
              </button>
            );
          })}
        </div>
      )}
      {kinds.length > 1 && (
        <div role="tablist" aria-label="Tipo de prenda" className={`flex gap-2 ${compact ? "scrollbar-none mb-5 overflow-x-auto" : "mb-8 flex-wrap"}`}>
          {(["all", ...kinds] as const).map((k) => {
            const on = active === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(k)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border-2 px-5 text-xs font-bold uppercase tracking-wide transition ${
                  on
                    ? light ? "border-black bg-black text-white" : "border-neon bg-neon text-black"
                    : light ? "border-neutral-300 text-black hover:border-black" : "border-white/25 text-white hover:border-neon hover:text-neon"
                }`}
              >
                {k === "all" ? "Todas" : KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      )}
      <div className={compact ? "group/rail relative" : ""}>
      {compact && (
        <>
          <button
            type="button"
            aria-label="Anteriores"
            onClick={() => slide(-1)}
            className="absolute -left-5 top-[38%] z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-xl text-white shadow-xl backdrop-blur transition hover:border-neon hover:text-neon lg:grid"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Siguientes"
            onClick={() => slide(1)}
            className="absolute -right-5 top-[38%] z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-xl text-white shadow-xl backdrop-blur transition hover:border-neon hover:text-neon lg:grid"
          >
            →
          </button>
        </>
      )}
      <div
        ref={compact ? view : undefined}
        onClickCapture={
          compact
            ? (e) => {
                // A drag that ends on a card must not open it.
                if (view.current?.dataset.dragged) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            : undefined
        }
        className={compact ? "-mx-6 touch-pan-y select-none overflow-hidden pb-4 lg:mx-0" : ""}
      >
      <ul
        ref={compact ? rail : undefined}
        className={
          compact
            ? "flex w-full gap-4 px-6 will-change-transform lg:gap-6 lg:px-0"
            : "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {(loops ? [...shown, ...shown] : shown).map((i, n) => (
          <CollectionGarmentCard
            key={n >= shown.length ? `${i.key}~2` : i.key}
            href={i.href}
            blankHref={i.blankHref}
            title={i.title}
            description={i.description}
            badge={i.badge}
            frontArt={i.frontArt}
            backArt={i.backArt}
            frontScale={i.frontScale}
            backScale={i.backScale}
            basePrice={i.basePrice}
            compareAtPrice={i.compareAtPrice}
            colors={i.colors}
            preferColor={colorName || defaultColor}
            light={light}
            className={compact ? "w-[72vw] max-w-[320px] shrink-0 lg:w-[calc((100%-4.5rem)/4)] lg:max-w-none" : ""}
            reveal={compact}
            revealIndex={n % Math.max(1, shown.length)}
            duplicate={loops && n >= shown.length}
          />
        ))}
      </ul>
      </div>
      {loops && (
        <div aria-hidden="true" className="relative mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10 lg:mt-6 lg:w-64">
          <div ref={thumb} className="absolute inset-y-0 left-0 w-[18%] rounded-full bg-neon will-change-transform" />
        </div>
      )}
      </div>
      {shown.length === 0 && <p className={`py-10 text-center ${light ? "text-neutral-600" : "text-neutral-400"}`}>No hay prendas con ese filtro. Prueba con otro color o tipo de prenda.</p>}
    </>
  );
}
