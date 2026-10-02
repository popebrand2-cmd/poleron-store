"use client";

import { useState } from "react";
import CollectionGarmentCard, { type GarmentColor } from "@/components/CollectionGarmentCard";

export type GarmentKind = "polera" | "poleron" | "boxy";
export type GarmentItem = {
  key: string;
  kind: GarmentKind;
  href: string;
  title: string;
  description?: string;
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
export default function CollectionGarmentsGrid({ items }: { items: GarmentItem[] }) {
  const kinds = KIND_ORDER.filter((k) => items.some((i) => i.kind === k));
  const [active, setActive] = useState<GarmentKind | "all">("all");
  const shown = active === "all" ? items : items.filter((i) => i.kind === active);

  return (
    <>
      {kinds.length > 1 && (
        <div role="tablist" aria-label="Tipo de prenda" className="mb-8 flex flex-wrap gap-2">
          {(["all", ...kinds] as const).map((k) => {
            const on = active === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(k)}
                className={`min-h-11 rounded-full border-2 px-5 text-xs font-bold uppercase tracking-wide transition ${
                  on ? "border-neon bg-neon text-black" : "border-white/25 text-white hover:border-neon hover:text-neon"
                }`}
              >
                {k === "all" ? "Todas" : KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
      )}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((i) => (
          <CollectionGarmentCard
            key={i.key}
            href={i.href}
            title={i.title}
            description={i.description}
            frontArt={i.frontArt}
            backArt={i.backArt}
            frontScale={i.frontScale}
            backScale={i.backScale}
            basePrice={i.basePrice}
            compareAtPrice={i.compareAtPrice}
            colors={i.colors}
          />
        ))}
      </ul>
    </>
  );
}
