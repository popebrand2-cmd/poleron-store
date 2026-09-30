"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Txt from "@/components/edit/Txt";

export type LookbookProduct = { slug: string; colors: { name: string; hex: string }[] };
export type LookbookDesign = { id: string; name: string; imageUrl: string; placement: "FRONT" | "BACK" };

type Garment = {
  id: string;
  type: "tee" | "hoodie";
  garmentLabel: string; // "Polera" | "Polerón"
  designName: string;
  x: number; // % of the photo's width
  y: number; // % of the photo's height
  thumb: string; // a real crop of the campaign photo around that print — used while no design is picked
};

// Positions were measured by eye against public/promo/cyber-lookbook.webp (the same campaign photo,
// cropped to drop the baked-in logo/headline so real text can sit over it instead — see the crop note
// in scripts/ history). If that photo is ever swapped, these need to be re-measured against the new
// one the same way.
const GARMENTS: Garment[] = [
  { id: "anti-social", type: "tee", garmentLabel: "Polera", designName: "Anti Social Social Club", x: 8, y: 49, thumb: "/promo/thumb-anti-social.webp" },
  { id: "driver", type: "hoodie", garmentLabel: "Polerón", designName: "Driver", x: 32, y: 34, thumb: "/promo/thumb-driver.webp" },
  { id: "passenger", type: "tee", garmentLabel: "Polera", designName: "Passenger Princess", x: 57, y: 35, thumb: "/promo/thumb-passenger.webp" },
  { id: "sistine", type: "tee", garmentLabel: "Polera", designName: "Manos", x: 83, y: 32, thumb: "/promo/thumb-sistine.webp" },
  { id: "assasssin", type: "tee", garmentLabel: "Polera", designName: "Assasssin Doll", x: 20, y: 71, thumb: "/promo/thumb-assasssin.webp" },
  { id: "cocktail", type: "tee", garmentLabel: "Polera", designName: "Cocktail", x: 47, y: 68, thumb: "/promo/thumb-cocktail.webp" },
  { id: "war", type: "hoodie", garmentLabel: "Polerón", designName: "W_A_R", x: 79, y: 72, thumb: "/promo/thumb-war.webp" },
];

function Card({
  garment,
  product,
  designs,
  startIndex,
  titleId,
  onClose,
}: {
  garment: Garment;
  product: LookbookProduct | null;
  designs: LookbookDesign[];
  startIndex: number;
  titleId: string;
  onClose: () => void;
}) {
  const [colorIdx, setColorIdx] = useState(0);
  const [designIdx, setDesignIdx] = useState(startIndex);
  const design = designs.length > 0 ? designs[designIdx % designs.length] : null;
  const canCycle = designs.length > 1;

  function step(dir: 1 | -1) {
    if (!canCycle) return;
    setDesignIdx((i) => (i + dir + designs.length) % designs.length);
  }

  return (
    <div role="group" aria-labelledby={titleId} className="w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900 p-4 text-left text-white shadow-2xl sm:w-72">
      <div className="flex items-start justify-between gap-2">
        <h3 id={titleId} className="font-display text-xl font-bold uppercase leading-none">
          {garment.garmentLabel} {garment.designName}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-300">
        <Txt k="lookbook.cardSubtitle" as="span" />
      </p>

      {product && product.colors.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {product.colors.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColorIdx(i)}
              aria-label={c.name}
              aria-pressed={i === colorIdx}
              className={`h-6 w-6 rounded-full border-2 transition ${i === colorIdx ? "border-neon" : "border-white/40"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        <Txt k="lookbook.designLabel" as="span" />
      </p>
      {design ? (
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!canCycle}
            aria-label="Diseño anterior"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
              canCycle ? "border-white/30 text-white hover:border-neon hover:text-neon" : "cursor-default border-white/10 text-white/25"
            }`}
          >
            ‹
          </button>
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={design.imageUrl} alt={design.name} className="h-full w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!canCycle}
            aria-label="Diseño siguiente"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
              canCycle ? "border-white/30 text-white hover:border-neon hover:text-neon" : "cursor-default border-white/10 text-white/25"
            }`}
          >
            ›
          </button>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-200">{design.name}</span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garment.thumb} alt={garment.designName} className="h-full w-full object-cover" />
          </div>
          <span className="text-xs text-neutral-400">Muy pronto vas a poder elegir otros diseños aquí.</span>
        </div>
      )}

      {product ? (
        <Link
          href={design ? `/productos/${product.slug}?diseno=${design.id}` : `/productos/${product.slug}`}
          className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full bg-neon px-5 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Txt k="lookbook.personalizeCta" as="span" />
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="mt-4 text-xs text-neutral-400">Esta prenda aún no está publicada en la tienda.</p>
      )}
    </div>
  );
}

// The photo + hotspots + floating (desktop) card + bottom breadcrumb, at a fixed aspect ratio matching
// the source photo exactly — so hotspot percentages never drift off their garment at any width, and no
// one in the shot gets cropped. Shared by the desktop (photo fills the whole hero, text overlaid on
// top of it) and mobile (photo is its own block, below the text) layouts below.
function PhotoStage({
  uid,
  openId,
  setOpenId,
  productFor,
  designs,
  showDesktopCard,
}: {
  uid: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  productFor: (g: Garment) => LookbookProduct | null;
  designs: LookbookDesign[];
  showDesktopCard: boolean;
}) {
  const open = GARMENTS.find((g) => g.id === openId) ?? null;
  const openIndex = open ? GARMENTS.indexOf(open) : 0;
  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/promo/cyber-lookbook.webp"
        alt="Clientes POPE con polerones y poleras personalizadas"
        className="h-full w-full object-cover"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
      />

      {/* Spotlight: dims the rest of the photo and leaves a soft halo over the picked garment — the
          closest honest approximation to "highlight its silhouette" without a per-garment cutout mask
          for each of the 7 people (flagged as a missing resource in the project notes). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/55 transition-opacity duration-300 motion-reduce:transition-none"
        style={{
          opacity: open ? 1 : 0,
          maskImage: open ? `radial-gradient(140px at ${open.x}% ${open.y}%, transparent 35%, black 78%)` : undefined,
          WebkitMaskImage: open ? `radial-gradient(140px at ${open.x}% ${open.y}%, transparent 35%, black 78%)` : undefined,
        }}
      />

      {GARMENTS.map((g) => {
        const isOpen = g.id === openId;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => setOpenId(isOpen ? null : g.id)}
            aria-expanded={isOpen}
            aria-controls={`${uid}-${g.id}`}
            aria-label={`${g.garmentLabel} ${g.designName}`}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-neon bg-black/55 font-bold text-neon transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ left: `${g.x}%`, top: `${g.y}%` }}
          >
            +
          </button>
        );
      })}

      {open && showDesktopCard && (
        <div
          id={`${uid}-${open.id}`}
          className="pointer-events-auto absolute z-10 -translate-y-1/2"
          style={{
            top: `${open.y}%`,
            ...(open.x > 55 ? { right: `${100 - open.x + 6}%` } : { left: `${open.x + 6}%` }),
          }}
        >
          <Card
            key={open.id}
            garment={open}
            product={productFor(open)}
            designs={designs}
            startIndex={designs.length ? openIndex % designs.length : 0}
            titleId={`${uid}-${open.id}-title`}
            onClose={() => setOpenId(null)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent py-3">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300">
          <Txt k="lookbook.steps" as="span" />
        </p>
      </div>
    </div>
  );
}

// Interactive "shop the look": the Cyber campaign photo, full-bleed, with one hotspot per garment.
// Picking one spotlights it and opens a card (type + design + the REAL colors of that garment's
// product) with a PERSONALIZAR button that opens the real editor for that garment. There's no
// preset-design image for these 7 yet (see the project notes handed back after building this), so
// PERSONALIZAR opens the right garment's editor without a design preloaded — still a real, working
// page, just not pre-filled. Auto-hides together with the rest of the Cyber campaign.
export default function CyberLookbook({
  active,
  editorHref,
  teeProduct,
  hoodieProduct,
  designs,
}: {
  active: boolean;
  editorHref: string;
  teeProduct: LookbookProduct | null;
  hoodieProduct: LookbookProduct | null;
  designs: LookbookDesign[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  useEffect(() => {
    if (!openId) return;
    function onDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openId]);

  if (!active) return null;

  const open = GARMENTS.find((g) => g.id === openId) ?? null;
  const productFor = (g: Garment) => (g.type === "tee" ? teeProduct : hoodieProduct);

  const copy = (
    <>
      <span className="inline-flex items-center rounded-full bg-neon px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-black">
        <Txt k="cyber.badge" as="span" />
      </span>

      <h2 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.92] text-white sm:text-6xl">
        <span className="block">
          <Txt k="hero.line1" as="span" />
        </span>
        <span className="block text-neon">
          <Txt k="hero.line2" as="span" />
        </span>
      </h2>

      <p className="mt-3 max-w-sm text-lg text-neutral-200">
        <Txt k="lookbook.subtext" as="span" />
      </p>

      <div className="mt-6">
        <Link
          href={editorHref}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-neon px-7 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
        >
          <Txt k="lookbook.cta" as="span" />
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <p className="mt-5 flex items-center gap-2 text-xs text-neutral-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M9 9h.01M15 9h.01M8 13c1 1.5 2.5 2.5 4 2.5s3-1 4-2.5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        <Txt k="lookbook.hint" as="span" />
      </p>
    </>
  );

  return (
    <section aria-label="Cyber POPE: elige una prenda" ref={containerRef} className="relative isolate overflow-hidden border-b border-white/10 bg-black text-white">
      {/* Desktop / tablet: one continuous photo fills the whole hero; the copy sits directly on top of
          it (left side), same as the reference the owner is matching. */}
      <div className="relative hidden lg:block" style={{ aspectRatio: "1230 / 667" }}>
        <PhotoStage uid={uid} openId={openId} setOpenId={setOpenId} productFor={productFor} designs={designs} showDesktopCard />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex max-w-md flex-col justify-center px-10">
          <div className="pointer-events-auto">{copy}</div>
        </div>
      </div>

      {/* Mobile: the photo doesn't have room to carry the copy too, so it's its own block below the
          text, and the picked card renders under the photo instead of floating over it — the same
          adjustment the original brief asked for. */}
      <div className="lg:hidden">
        <div className="px-5 pb-6 pt-10">{copy}</div>
        <div className="relative w-full" style={{ aspectRatio: "1230 / 667" }}>
          <PhotoStage uid={uid} openId={openId} setOpenId={setOpenId} productFor={productFor} designs={designs} showDesktopCard={false} />
        </div>
        {open && (
          <div id={`${uid}-${open.id}-mobile`} className="flex justify-center px-5 pb-24 pt-6">
            <Card
              key={open.id}
              garment={open}
              product={productFor(open)}
              designs={designs}
              startIndex={designs.length ? GARMENTS.indexOf(open) % designs.length : 0}
              titleId={`${uid}-${open.id}-title-m`}
              onClose={() => setOpenId(null)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
