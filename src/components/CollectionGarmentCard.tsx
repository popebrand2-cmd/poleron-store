"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/money";
import { garmentPhoto } from "@/lib/garment-photo";

// Deep-green halo (a darker take of the brand green) around every garment, so all cards look the same.
const BACK_SHADOW = "drop-shadow(-12px 8px 14px rgba(0,0,0,0.38))";
const GARMENT_GLOW = "drop-shadow(0 0 1px rgba(0,0,0,0.45)) drop-shadow(0 0 6px color-mix(in srgb, var(--neon) 34%, #000)) drop-shadow(0 4px 16px color-mix(in srgb, var(--neon) 24%, #000))";
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
function Mock({ view, design, scale = 1, fallback = "" }: { view: GarmentView; design: string; scale?: number; fallback?: string }) {
  // The art stays hidden until the garment photo is there: the first time a photo is cleaned it takes a moment,
  // and a design floating on its own looks broken.
  const photo = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // A new colour brings a new photo: wait for it again (it may already be in the browser cache).
    setReady(!!(photo.current?.complete && photo.current.naturalWidth > 0));
  }, [view.imageUrl]);
  // If the art file is gone from the server, show the fallback art (the other side's) instead of a broken-image
  // icon, and nothing at all if that fails too.
  const [artState, setArtState] = useState<0 | 1 | 2>(0);
  useEffect(() => setArtState(0), [design]);
  const art = artState === 0 ? design : artState === 1 ? fallback : "";
  const artImg = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // The failure may already have happened before React attached the error handler (server-rendered page).
    const i = artImg.current;
    if (i && i.complete && i.naturalWidth === 0) setArtState((s) => (s === 0 && fallback ? 1 : 2));
  }, [art, fallback]);
  if (!art) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={garmentPhoto(view.imageUrl)} alt="" loading="lazy" decoding="async" draggable={false} className="block h-auto max-h-full w-auto max-w-full" />;
  }
  const w = view.zoneWidthPct * scale;
  const h = view.zoneHeightPct * scale;
  return (
    <div className={`relative inline-block max-w-full leading-[0] transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={photo} onLoad={() => setReady(true)} onError={() => setReady(true)} src={garmentPhoto(view.imageUrl)} alt="" loading="lazy" decoding="async" draggable={false} className="block h-auto max-h-full w-auto max-w-full" />
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
        <img
          ref={artImg}
          src={art}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setArtState((s) => (s === 0 && fallback ? 1 : 2))}
          className="h-full w-full object-contain"
        />
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
  preferColor = "",
  className = "",
  blankHref,
}: {
  className?: string;
  // Where "+ Personalizar" goes: the same garment with nothing printed. `href` (the card itself) opens it with this design on.
  blankHref?: string;
  // Color picked in the collection's color filter: the card opens on it (when it has it).
  preferColor?: string;
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
  useEffect(() => {
    const idx = preferColor ? colors.findIndex((c) => c.name === preferColor) : -1;
    setI(idx >= 0 ? idx : 0);
  }, [preferColor, colors]);
  const color = colors[peek ?? i] ?? colors[0];
  const front = color?.views.find((v) => v.label === "Frente") ?? color?.views[0];
  // A real back view only: if the "Espalda" photo is just the front photo again, it is not shown as a back.
  const backView = color?.views.find((v) => v.label === "Espalda");
  const back = backView && backView.imageUrl !== front?.imageUrl ? backView : undefined;
  const badgeLabel = badge?.trim() || "";
  const pct = basePrice != null && compareAtPrice && compareAtPrice > basePrice ? Math.round(100 - (basePrice / compareAtPrice) * 100) : 0;

  return (
    <li className={`group ${className}`}>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f1f1f1]">
        {/* The whole picture is a link to the garment with this design already on it */}
        <Link href={href} aria-label={title} className="absolute inset-0 z-[1]" />
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
            <Mock view={back} design={backArt} scale={backScale} fallback={frontArt} />
          </div>
        )}
        {colors.map((c) => c.imageUrl && c !== color && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={c.imageUrl} src={c.imageUrl} alt="" aria-hidden="true" decoding="async" className="hidden" />
        ))}
        <Link
          href={blankHref ?? href}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-full bg-neon px-6 py-3 text-sm font-bold text-black opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.45)] ring-1 ring-black/20 transition duration-300 hover:brightness-90 focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"
        >
          + Personalizar
        </Link>
      </div>
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
