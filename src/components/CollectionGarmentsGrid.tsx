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
  const rail = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const shown = items.filter((i) => (active === "all" || i.kind === active) && (!colorName || i.colors.some((c) => c.name === colorName)));
  // Homepage rail: the row never stops. It glides on its own, forever (the cards are repeated once so there is no end),
  // slows down under the cursor so a card can be clicked, and waits while the visitor drags it or uses the arrows.
  const loops = compact && shown.length > 1;
  const lastTouch = useRef(0);
  const touched = () => {
    lastTouch.current = Date.now();
  };
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = rail.current;
    if (!compact || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [compact]);
  // Length of one full set of cards (where the second copy starts).
  const period = () => {
    const el = rail.current;
    const items = el ? el.querySelectorAll("li") : [];
    const n = items.length / 2;
    return n >= 1 && items[n] instanceof HTMLElement ? (items[n] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft : 0;
  };
  const SPEED = 110; // px per second (the reference video glides at about this pace)
  useEffect(() => {
    if (rail.current) rail.current.scrollLeft = 0;
  }, [active, colorName]);
  useEffect(() => {
    const el = rail.current;
    if (!loops || !el || !inView) return;
    let pos = el.scrollLeft;
    let last = performance.now();
    let hover = false;
    let down = false;
    let factor = 1;
    let raf = 0;
    // Only a real mouse slows it down: on a phone a tap leaves an emulated "hover" behind that would never go away.
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = false;
    };
    const onDown = () => {
      down = true;
      touched();
    };
    const onUp = () => {
      down = false;
      touched();
    };
    // Where this code last left the row: a scroll to anywhere else is the visitor's finger (or its momentum), which also
    // pauses the glide. On a phone the browser takes over the drag and cancels the pointer, so the scroll itself is the signal.
    let expected = el.scrollLeft;
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - expected) > 1.5) touched();
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchend", onUp, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const paint = () => {
      const p = period();
      if (thumb.current && p > 0) {
        const w = 18;
        thumb.current.style.width = w + "%";
        thumb.current.style.left = ((el.scrollLeft % p) / p) * (100 - w) + "%";
      }
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = period();
      if (document.hidden || !p) return;
      // Somebody else moved the row since the last frame (a finger, its momentum, the arrows): leave it alone for a moment.
      if (Math.abs(el.scrollLeft - expected) > 1.5) touched();
      if (down || Date.now() - lastTouch.current < 2500) {
        // The visitor is moving it by hand: follow, and loop the same way.
        if (el.scrollLeft >= p) el.scrollLeft -= p;
        pos = el.scrollLeft;
        expected = pos;
        paint();
        return;
      }
      factor += ((hover ? 0.25 : 1) - factor) * Math.min(1, dt * 6);
      pos += SPEED * factor * dt;
      if (pos >= p) pos -= p;
      el.scrollLeft = pos;
      expected = el.scrollLeft;
      paint();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchend", onUp);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [loops, inView, active, colorName]);
  const slide = (dir: 1 | -1) => {
    touched();
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = (card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8) * (window.innerWidth >= 1024 ? 2 : 1);
    const p = period();
    // Going back from the start: jump (unseen, the copies are identical) to the same place in the second copy first.
    if (dir < 0 && p > 0 && el.scrollLeft < step) el.scrollLeft += p;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
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
                onClick={() => {
                  setActive(k);
                  touched();
                }}
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
      <ul
        ref={compact ? rail : undefined}
        onWheel={compact ? (e) => Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 4 && touched() : undefined}
        onTouchMove={compact ? touched : undefined}
        className={
          compact
            ? "scrollbar-none -mx-6 flex gap-4 overflow-x-auto px-6 pb-4 lg:mx-0 lg:gap-6 lg:px-0"
            : "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        }
        style={compact ? { scrollbarWidth: "none" } : undefined}
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
      {loops && (
        <div aria-hidden="true" className="relative mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10 lg:mt-6 lg:w-64">
          <div ref={thumb} className="absolute inset-y-0 rounded-full bg-neon" style={{ width: "18%", left: "0%" }} />
        </div>
      )}
      </div>
      {shown.length === 0 && <p className={`py-10 text-center ${light ? "text-neutral-600" : "text-neutral-400"}`}>No hay prendas con ese filtro. Prueba con otro color o tipo de prenda.</p>}
    </>
  );
}
