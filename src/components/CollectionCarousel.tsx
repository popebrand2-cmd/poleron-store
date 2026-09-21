"use client";

import { useRef } from "react";

export type CollectionDesignCard = { id: string; name: string; imageUrl: string };

export default function CollectionCarousel({ designs }: { designs: CollectionDesignCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(560, el.clientWidth * 0.9), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="scrollbar-none -mx-4 -mb-8 -mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-10 pt-6"
        style={{ scrollbarWidth: "none" }}
      >
        {designs.map((d) => (
          <div key={d.id} className="w-36 shrink-0 snap-start sm:w-44">
            <div className="glass glass-hover relative overflow-hidden rounded-2xl p-2.5">
              <span className="absolute left-2 top-2 z-10 glass-neon rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                Personalizable
              </span>
              <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.imageUrl} alt={d.name} className="h-full w-full object-contain p-2" />
              </div>
            </div>
            <p className="mt-2 truncate text-center text-xs font-semibold uppercase tracking-wide text-white">
              {d.name}
            </p>
          </div>
        ))}
      </div>

      {designs.length > 4 && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white transition hover:border-neon hover:text-neon"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-white transition hover:border-neon hover:text-neon"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
