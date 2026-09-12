"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { formatCLP } from "@/lib/money";

export type FeaturedProductColor = { name: string; hex: string; imageUrl: string | null };

export type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  colors: FeaturedProductColor[];
};

// Whether a garment color reads as "light" — used to flip the card's
// backdrop so the garment always shows up against it (a black hoodie needs
// a light backdrop, a white one needs a dark backdrop) instead of both
// sitting on the same dark card background and disappearing into it.
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Manual per-photo vertical nudge. object-contain preserves each source
// photo's own framing, but these product photos aren't framed consistently
// with each other — the white tee has a much bigger gap above the collar
// than the black one, and both hoodie photos crop the hood almost flush
// with the top edge. Tuned by eye against the actual photos; revisit if
// they're ever replaced.
function garmentPositionY(productName: string, colorName: string): string {
  if (/tee|polera/i.test(productName) && /blanco/i.test(colorName)) return "15%";
  if (/hoodie|poler[oó]n/i.test(productName)) return "70%";
  return "50%";
}

function ProductCard({ p }: { p: FeaturedProduct }) {
  const [hovered, setHovered] = useState(false);
  const base = p.colors[0];
  const alt = p.colors[1];
  // Hover swaps to the other color (if there is one) so the customer sees
  // both options without leaving the carousel; moving the cursor away
  // switches it back.
  const shown = hovered && alt ? alt : base;
  const backdropClass = shown && isLightColor(shown.hex) ? "bg-black" : "bg-white";

  return (
    <Link
      href={`/productos/${p.slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-neon sm:w-[260px]"
    >
      <span className="absolute left-3 top-3 z-10 rounded bg-neon px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
        Personalizable
      </span>
      <div className={`aspect-square overflow-hidden p-3 transition-colors ${backdropClass}`}>
        {shown?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={shown.imageUrl}
            src={shown.imageUrl}
            alt={`${p.name} — ${shown.name}`}
            style={{ objectPosition: `50% ${garmentPositionY(p.name, shown.name)}` }}
            className="h-full w-full object-contain transition group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold uppercase tracking-tight text-white">{p.name}</p>
        <p className="mt-1 text-sm text-neutral-400">{formatCLP(p.basePrice)}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-neon">Ver producto →</p>
      </div>
    </Link>
  );
}

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
          <ProductCard key={p.id} p={p} />
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
