"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/money";
import { garmentPhoto } from "@/lib/garment-photo";

// Deep-green halo (a darker take of the brand green) around every garment, so all cards look the same.
const BACK_SHADOW = "drop-shadow(-12px 8px 14px rgba(0,0,0,0.38))";
const GARMENT_GLOW = "drop-shadow(0 0 1px rgba(0,0,0,0.45)) drop-shadow(0 0 9px color-mix(in srgb, var(--neon) 42%, #000)) drop-shadow(0 6px 26px color-mix(in srgb, var(--neon) 34%, #000))";
const BACK_GLOW = `${BACK_SHADOW} ${GARMENT_GLOW}`;

export type GarmentView = {
  label: string;
  imageUrl: string;
  zoneXPct: number;
  zoneYPct: number;
  zoneWidthPct: number;
  zoneHeightPct: number;
};
// A color is either shot views the design is overlaid on, or one finished mockup image (imageUrl).
export type GarmentColor = { name: string; hex: string; views: GarmentView[]; imageUrl?: string };

// A garment photo with the collection design laid over its print zone. The wrapper hugs the photo
// (inline-block + a plain <img>), so the zone's percentages line up with the garment exactly.
function Mock({ view, design, scale = 1 }: { view: GarmentView; design: string; scale?: number }) {
  if (!design) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={garmentPhoto(view.imageUrl)} alt="" loading="lazy" decoding="async" draggable={false} className="block h-auto max-h-full w-auto max-w-full" />;
  }
  const w = view.zoneWidthPct * scale;
  const h = view.zoneHeightPct * scale;
  return (
    <div className="relative inline-block max-w-full leading-[0]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={garmentPhoto(view.imageUrl)} alt="" loading="lazy" decoding="async" draggable={false} className="block h-auto max-h-full w-auto max-w-full" />
      <div
        className="absolute"
        style={{
          left: `${view.zoneXPct + (view.zoneWidthPct - w) / 2}%`,
          top: `${view.zoneYPct}%`,
          width: `${w}%`,
          height: `${h}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={design} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
      </div>
    </div>
  );
}

// One ready-made garment of a collection: the design already printed on it, front and back like a
// store shelf. Price and the "Ahorra" badge come from the product itself (nothing invented).
export default function CollectionGarmentCard({
  href,
  title,
  description,
  badge,
  frontArt = "",
  backArt = "",
  frontScale = 0.6,
  backScale = 1,
  basePrice,
  compareAtPrice,
  colors,
}: {
  href: string;
  title: string;
  description?: string;
  // Owner-written corner label; empty = "Ahorra X%" from the previous price (none when there is no sale).
  badge?: string;
  // The art printed on the front / back views (empty = that side stays plain) and how big, relative to the print zone.
  frontArt?: string;
  backArt?: string;
  frontScale?: number;
  backScale?: number;
  basePrice: number | null;
  compareAtPrice: number | null;
  colors: GarmentColor[];
}) {
  const [i, setI] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const color = colors[peek ?? i] ?? colors[0];
  const front = color?.views.find((v) => v.label === "Frente") ?? color?.views[0];
  // A real back view only: if the "Espalda" photo is just the front photo again, it is not shown as a back.
  const backView = color?.views.find((v) => v.label === "Espalda");
  const back = backView && backView.imageUrl !== front?.imageUrl ? backView : undefined;
  const badgeLabel = badge?.trim() || "";
  const pct = basePrice != null && compareAtPrice && compareAtPrice > basePrice ? Math.round(100 - (basePrice / compareAtPrice) * 100) : 0;

  return (
    <li className="group">
      <Link href={href} className={`relative block aspect-square overflow-hidden rounded-xl bg-[#f1f1f1]`}>
        {(badgeLabel || pct > 0) && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#e5484d] px-3 py-1 text-xs font-bold text-white">{badgeLabel || `Ahorra ${pct}%`}</span>
        )}
        {color?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={color.imageUrl} alt={title} loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]" style={{ filter: GARMENT_GLOW }} />
        )}
        {!color?.imageUrl && front && (
          <div style={{ filter: GARMENT_GLOW }} className={`absolute flex items-start justify-start transition duration-500 group-hover:scale-[1.03] ${back ? "left-[2%] top-[3%] h-[78%] w-[78%]" : "inset-[6%]"}`}>
            <Mock view={front} design={frontArt} scale={frontScale} />
          </div>
        )}
        {!color?.imageUrl && back && (
          <div style={{ filter: BACK_GLOW }} className="absolute bottom-[2%] right-[1%] flex h-[78%] w-[78%] items-end justify-end transition duration-500 group-hover:scale-[1.03]">
            <Mock view={back} design={backArt} scale={backScale} />
          </div>
        )}
        {colors.map((c) => c.imageUrl && c !== color && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={c.imageUrl} src={c.imageUrl} alt="" aria-hidden="true" decoding="async" className="hidden" />
        ))}
        <span className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-full bg-black px-6 py-3 text-sm font-bold text-white opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
          + Personalizar
        </span>
      </Link>
      <Link href={href} className="mt-4 line-clamp-2 block text-base font-semibold leading-snug text-white hover:text-neon">
        {title}
      </Link>
      {description && <p className="mt-1 line-clamp-2 text-sm leading-snug text-neutral-400">{description}</p>}
      {basePrice != null && (
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-[#ff6b6f]">{formatCLP(basePrice)}</span>
          {pct > 0 && <span className="text-sm text-neutral-500 line-through">{formatCLP(compareAtPrice as number)}</span>}
        </p>
      )}
      {colors.length > 0 && (
        <div className="mt-2 flex items-center gap-2" role="radiogroup" aria-label="Color">
          {colors.map((c, n) => (
            <button
              key={c.name + n}
              type="button"
              role="radio"
              aria-checked={n === i}
              aria-label={c.name}
              title={c.name}
              onClick={() => setI(n)}
              onMouseEnter={() => setPeek(n)}
              onMouseLeave={() => setPeek(null)}
              onFocus={() => setPeek(n)}
              onBlur={() => setPeek(null)}
              className={`h-5 w-5 rounded-full border border-white/40 transition ${n === i ? "ring-2 ring-neon ring-offset-2 ring-offset-black" : "hover:scale-110"}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      )}
    </li>
  );
}
