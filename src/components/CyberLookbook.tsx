"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Txt from "@/components/edit/Txt";

export type LookbookProduct = { slug: string; colors: { name: string; hex: string }[] };

type Garment = {
  id: string;
  type: "tee" | "hoodie";
  garmentLabel: string; // "Polera" | "Polerón"
  designName: string;
  x: number; // % of the photo's width
  y: number; // % of the photo's height
};

// Positions were measured by eye against public/promo/cyber-lookbook.webp (the same campaign photo,
// cropped to drop the baked-in logo/headline so real text can sit there instead — see the crop note
// in scripts/ history). If that photo is ever swapped, these need to be re-measured against the new
// one the same way.
const GARMENTS: Garment[] = [
  { id: "anti-social", type: "tee", garmentLabel: "Polera", designName: "Anti Social Social Club", x: 8, y: 49 },
  { id: "driver", type: "hoodie", garmentLabel: "Polerón", designName: "Driver", x: 32, y: 34 },
  { id: "passenger", type: "tee", garmentLabel: "Polera", designName: "Passenger Princess", x: 57, y: 35 },
  { id: "sistine", type: "tee", garmentLabel: "Polera", designName: "Manos", x: 83, y: 32 },
  { id: "assasssin", type: "tee", garmentLabel: "Polera", designName: "Assasssin Doll", x: 20, y: 71 },
  { id: "cocktail", type: "tee", garmentLabel: "Polera", designName: "Cocktail", x: 47, y: 68 },
  { id: "war", type: "hoodie", garmentLabel: "Polerón", designName: "W_A_R", x: 79, y: 72 },
];

// Same copy as the main hero (hero.line1/line2), sized for this section's narrower column instead of
// the hero's full-bleed scale, with the same word-by-word look via Txt's own edit-mode fallback.
function LookbookHeadline() {
  return (
    <h2 className="font-display text-4xl font-bold uppercase leading-[0.92] text-white sm:text-5xl">
      <span className="block">
        <Txt k="hero.line1" as="span" />
      </span>
      <span className="block text-neon">
        <Txt k="hero.line2" as="span" />
      </span>
    </h2>
  );
}

function Card({
  garment,
  product,
  titleId,
  onClose,
}: {
  garment: Garment;
  product: LookbookProduct | null;
  titleId: string;
  onClose: () => void;
}) {
  const [colorIdx, setColorIdx] = useState(0);
  return (
    <div role="group" aria-labelledby={titleId} className="glass-dark w-full max-w-xs rounded-2xl p-4 text-left text-white sm:w-72">
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
              className={`h-6 w-6 rounded-full border-2 transition ${i === colorIdx ? "border-neon" : "border-white/30"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
        <Txt k="lookbook.designLabel" as="span" />
      </p>
      <p className="mt-0.5 text-sm font-semibold">{garment.designName}</p>

      {product ? (
        <Link
          href={`/productos/${product.slug}`}
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

// Interactive "shop the look": the Cyber campaign photo with one hotspot per garment. Picking one
// spotlights it and opens a card (type + design + the REAL colors of that garment's product) with a
// PERSONALIZAR button that opens the real editor for that garment. There's no preset-design image for
// these 7 yet (see the project notes handed back after building this), so PERSONALIZAR opens the
// right garment's editor without a design preloaded — still a real, working page, just not
// pre-filled. Auto-hides together with the rest of the Cyber campaign.
export default function CyberLookbook({
  active,
  editorHref,
  teeProduct,
  hoodieProduct,
}: {
  active: boolean;
  editorHref: string;
  teeProduct: LookbookProduct | null;
  hoodieProduct: LookbookProduct | null;
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

  // Close the open card if a click/tap lands outside the photo entirely.
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

  return (
    <section aria-label="Cyber POPE: elige una prenda" className="relative isolate overflow-hidden border-b border-white/10 bg-black text-white">
      {/* The campaign photo as one continuous backdrop behind the whole section (copy + photo box),
          not boxed to one side — duotoned green/black + a grain, so it reads as texture rather than a
          plain dimmed photo. The crisp, full-colour copy the hotspots sit on (further down) is a
          separate layer, so this decorative one can be pushed around freely without ever touching
          hotspot alignment. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/promo/cyber-lookbook.webp"
          alt=""
          className="h-full w-full scale-110 object-cover object-[72%_38%]"
          style={{ filter: "grayscale(1) contrast(1.2) brightness(0.6)" }}
        />
        <div
          className="absolute inset-0 mix-blend-color"
          style={{ background: "linear-gradient(115deg, color-mix(in srgb, var(--neon) 65%, black) 0%, black 75%)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/25" />
        <div className="absolute inset-0 bg-black/20" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 70% at 15% 40%, color-mix(in srgb, var(--neon) 14%, transparent), transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-10 lg:py-16">
        {/* Copy column */}
        <div>
          <span className="inline-flex items-center rounded-full bg-neon px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-black">
            <Txt k="cyber.badge" as="span" />
          </span>

          <div className="mt-4">
            <LookbookHeadline />
          </div>

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

          <p className="mt-5 flex items-center gap-2 text-xs text-neutral-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M9 9h.01M15 9h.01M8 13c1 1.5 2.5 2.5 4 2.5s3-1 4-2.5" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <Txt k="lookbook.hint" as="span" />
          </p>
        </div>

        {/* Photo column: fixed aspect ratio matching the source photo exactly, so hotspot percentages
            never drift off their garment at any viewport width, and no one in the shot gets cropped. */}
        <div ref={containerRef} className="relative">
          <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "1230 / 667" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/promo/cyber-lookbook.webp" alt="Clientes POPE con polerones y poleras personalizadas" className="h-full w-full object-cover" />

            {/* Spotlight: dims the rest of the photo and leaves a soft halo over the picked garment —
                the closest honest approximation to "highlight its silhouette" without a per-garment
                cutout mask for each of the 7 people (see the note handed back after this build). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none"
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
                  className="group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{ left: `${g.x}%`, top: `${g.y}%` }}
                >
                  <span
                    className={`absolute inset-0 rounded-full bg-neon/30 motion-safe:animate-ping ${isOpen ? "opacity-0" : "group-hover:opacity-0"}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 text-base font-bold shadow-[0_0_14px_-2px_color-mix(in_srgb,var(--neon)_70%,transparent)] transition ${
                      isOpen ? "border-black bg-neon text-black" : "border-neon bg-black/70 text-neon"
                    }`}
                  >
                    {isOpen ? "×" : "+"}
                  </span>
                </button>
              );
            })}

            {/* Desktop: card floats beside its hotspot. Flips to the opposite side near the edges so it
                never spills outside the photo. */}
            {open && (
              <div
                id={`${uid}-${open.id}`}
                className="pointer-events-auto absolute z-10 hidden -translate-y-1/2 lg:block"
                style={{
                  top: `${open.y}%`,
                  ...(open.x > 55 ? { right: `${100 - open.x + 6}%` } : { left: `${open.x + 6}%` }),
                }}
              >
                <Card garment={open} product={productFor(open)} titleId={`${uid}-${open.id}-title`} onClose={() => setOpenId(null)} />
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            <Txt k="lookbook.steps" as="span" />
          </p>

          {/* Mobile/tablet: the card renders below the photo instead, so it never covers a design. */}
          {open && (
            <div id={`${uid}-${open.id}-mobile`} className="mt-4 flex justify-center lg:hidden">
              <Card garment={open} product={productFor(open)} titleId={`${uid}-${open.id}-title-m`} onClose={() => setOpenId(null)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
