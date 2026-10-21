"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Txt from "@/components/edit/Txt";
import CollectionGarmentCard from "@/components/CollectionGarmentCard";
import type { GarmentItem } from "@/components/CollectionGarmentsGrid";

const SHOWN = 8;

// "Elige tu diseño": the ready-made garments of the collections on a light shelf, filtered by section (Artistas, Anime…).
// Four per row on a computer (two rows), two per row on a phone (the first four only).
export default function HomeDesigns({ items, categories }: { items: GarmentItem[]; categories: string[] }) {
  const [cat, setCat] = useState("");
  const shown = useMemo(() => (cat ? items.filter((i) => i.category === cat) : items).slice(0, SHOWN), [items, cat]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-xs transition sm:px-5 sm:text-sm ${
      active ? "border-black bg-black font-semibold text-white" : "border-black/20 bg-white text-black hover:border-black/60"
    }`;

  return (
    <section id="tienda" className="scroll-mt-24 bg-[#f5f5f3] text-black">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {categories.length > 1 && (
          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por sección">
            <button type="button" aria-pressed={cat === ""} onClick={() => setCat("")} className={chip(cat === "")}>
              <Txt k="home.designsAll" />
            </button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
            <Txt k="home.designsTitle" />
          </h2>
          <Link
            href={cat ? `/colecciones?categoria=${encodeURIComponent(cat)}` : "/colecciones"}
            className="mb-1 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-black hover:text-[#0b6b25]"
          >
            <Txt k="home.designsMore" />
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-4">
          {shown.map((item, n) => (
            <CollectionGarmentCard
              key={item.key}
              className={n >= 4 ? "max-lg:hidden" : ""}
              href={item.href}
              title={item.title}
              frontArt={item.frontArt}
              backArt={item.backArt}
              frontScale={item.frontScale}
              backScale={item.backScale}
              basePrice={item.basePrice}
              compareAtPrice={item.compareAtPrice}
              colors={item.colors}
              soldOut={item.soldOut}
              badge={item.badge}
              light
              shelf={<Txt k="home.designsCardCta" />}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
