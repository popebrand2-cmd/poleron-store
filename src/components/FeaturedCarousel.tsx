"use client";

import Link from "next/link";
import { useRef } from "react";
import { formatCLP } from "@/lib/money";

export type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
};

export default function FeaturedCarousel({ products }: { products: FeaturedProduct[] }) {
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
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/productos/${p.slug}`}
            className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-neon sm:w-[260px]"
          >
            <span className="absolute left-3 top-3 z-10 rounded bg-neon px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
              Personalizable
            </span>
            <div className="aspect-square overflow-hidden bg-neutral-950">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold uppercase tracking-tight text-white">{p.name}</p>
              <p className="mt-1 text-sm text-neutral-400">{formatCLP(p.basePrice)}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-neon">Ver producto →</p>
            </div>
          </Link>
        ))}
      </div>

      {products.length > 2 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 text-white transition hover:border-neon hover:text-neon"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Siguiente"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 text-white transition hover:border-neon hover:text-neon"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
