"use client";

import { useState } from "react";
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
      <ul
        className={
          compact
            ? "scrollbar-none -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto scroll-smooth px-6 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12 lg:overflow-visible lg:px-0 lg:pb-0"
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
            className={compact ? "w-[72vw] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none" : ""}
          />
        ))}
      </ul>
      {shown.length === 0 && <p className={`py-10 text-center ${light ? "text-neutral-600" : "text-neutral-400"}`}>No hay prendas con ese filtro. Prueba con otro color o tipo de prenda.</p>}
    </>
  );
}
