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
  const [progress, setProgress] = useState({ at: 0, size: 1, start: true, end: false });
  useEffect(() => {
    const el = rail.current;
    if (!compact || !el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress({ at: max > 0 ? el.scrollLeft / max : 0, size: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1, start: el.scrollLeft <= 4, end: el.scrollLeft >= max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [compact, active]);
  const slide = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * (window.innerWidth >= 1024 ? 2 : 1), behavior: "smooth" });
  };
  const shown = items.filter((i) => (active === "all" || i.kind === active) && (!colorName || i.colors.some((c) => c.name === colorName)));

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
            disabled={progress.start}
            className="absolute -left-5 top-[38%] z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-xl text-white shadow-xl backdrop-blur transition hover:border-neon hover:text-neon disabled:pointer-events-none disabled:opacity-0 lg:grid"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Siguientes"
            onClick={() => slide(1)}
            disabled={progress.end}
            className="absolute -right-5 top-[38%] z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 text-xl text-white shadow-xl backdrop-blur transition hover:border-neon hover:text-neon disabled:pointer-events-none disabled:opacity-0 lg:grid"
          >
            →
          </button>
        </>
      )}
      <ul
        ref={compact ? rail : undefined}
        className={
          compact
            ? "scrollbar-none -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto scroll-smooth px-6 pb-4 lg:mx-0 lg:gap-6 lg:scroll-px-0 lg:px-0"
            : "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4"
        }
        style={compact ? { scrollbarWidth: "none" } : undefined}
      >
        {shown.map((i) => (
          <CollectionGarmentCard
            key={i.key}
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
            className={compact ? "w-[72vw] max-w-[320px] shrink-0 snap-start lg:w-[calc((100%-4.5rem)/4)] lg:max-w-none" : ""}
            reveal={compact}
            revealIndex={i.key ? shown.indexOf(i) : 0}
          />
        ))}
      </ul>
      {compact && progress.size < 0.999 && (
        <div aria-hidden="true" className="relative mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10 lg:mt-6 lg:w-64">
          <div className="absolute inset-y-0 rounded-full bg-neon transition-[left] duration-200" style={{ width: `${Math.max(12, progress.size * 100)}%`, left: `${progress.at * (100 - Math.max(12, progress.size * 100))}%` }} />
        </div>
      )}
      </div>
      {shown.length === 0 && <p className={`py-10 text-center ${light ? "text-neutral-600" : "text-neutral-400"}`}>No hay prendas con ese filtro. Prueba con otro color o tipo de prenda.</p>}
    </>
  );
}
