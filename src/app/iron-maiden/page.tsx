import type { Metadata } from "next";
import Link from "next/link";
import { loadLimitedCards } from "@/lib/limited";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import ExclusiveGrid from "@/components/ExclusiveGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iron Maiden — Colección exclusiva POPE",
  description: "Poleras negras de Iron Maiden con el estampado grande adelante, $11.999, tallas S a 3XL. Agrégale tu diseño atrás por $17.999. Solo en POPE.",
};

// The artworks of the drop, behind the title like a wall of tour posters.
const POSTERS = ["eddie-londres", "the-trooper", "powerslave", "infinite-dreams", "las-caras-de-eddie", "eddie-hammer", "eddie-huaso", "eddie-faraon", "est-1975"];
const SONGS = ["Up the Irons", "The Trooper", "Powerslave", "Fear of the Dark", "Run to the Hills", "Aces High", "The Number of the Beast", "Wasted Years", "Hallowed Be Thy Name"];

// The Iron Maiden exclusive section: every Iron Maiden piece on sale, black tees with the big print on the front.
export default async function IronMaidenPage() {
  const all = (await loadLimitedCards()).filter((c) => /iron maiden/i.test(c.name) && !c.closed);
  // The featured piece on top: "Run For Your Lives", the full-colour sublimated one (the first Iron Maiden piece, not one
  // of the poster tees). The grid below shows the rest.
  const featured = all.find((c) => c.slug === "polera-iron-maiden") ?? all.find((c) => !c.slug.startsWith("iron-maiden-")) ?? null;
  const items = all.filter((c) => c !== featured);
  const featuredSizes = featured
    ? ((await prisma.product.findUnique({ where: { slug: featured.slug }, select: { sizes: { orderBy: { sortOrder: "asc" }, select: { label: true } } } }))?.sizes ?? []).map((z) => z.label)
    : [];
  const price = items.find((c) => !c.soldOut)?.price ?? items[0]?.price ?? 11999;
  // "Personaliza tu polera aquí": the store's tee (not the hoodie the rest of the store opens with), already in black.
  const tee =
    (await prisma.product.findFirst({ where: { slug: "tee-oversize", active: true }, select: { slug: true } })) ??
    (await prisma.product.findFirst({ where: { active: true, limitedEdition: false, name: { contains: "Polera" } }, orderBy: { createdAt: "asc" }, select: { slug: true } }));
  const customizeHref = tee ? `/productos/${tee.slug}?color=Negro` : "/personaliza";

  return (
    <main className="bg-[#070707] text-white" style={{ ["--neon" as string]: "#e11d2a" } as React.CSSProperties}>
      {/* Hero: a wall of posters, darkened, under the red title */}
      <section className="relative isolate overflow-hidden border-b border-[#e11d2a]/40">
        <div aria-hidden="true" className="absolute inset-[-12%] -z-20 grid rotate-[-7deg] grid-cols-3 gap-3 opacity-60 sm:grid-cols-5 lg:grid-cols-9">
          {[...POSTERS, ...POSTERS].map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${p}-${i}`} src={`/iron-maiden/${p}.webp`} alt="" loading={i < 9 ? "eager" : "lazy"} className="aspect-[3/4] w-full rounded-md object-cover" />
          ))}
        </div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(120,10,18,0.5),rgba(7,7,7,0.8)_72%),linear-gradient(to_bottom,rgba(7,7,7,0.25),#070707)]" />

        <div className="mx-auto max-w-5xl px-5 pb-12 pt-14 text-center sm:pb-16 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-white">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e11d2a]" />
            Colección exclusiva · Solo en POPE
          </p>
          {/* The band's own logo (the owner's file), with a thin white edge and a red glow */}
          <h1 className="mx-auto mt-6 w-full max-w-2xl px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/iron-maiden/logo.webp"
              alt="Iron Maiden"
              width={1400}
              height={789}
              fetchPriority="high"
              className="h-auto w-full"
              style={{ filter: "drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff) drop-shadow(0 12px 36px rgba(225,29,42,0.55))" }}
            />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-neutral-200 sm:text-lg">
            Eddie en todas sus épocas, en poleras negras con el estampado grande adelante. Para los que llevan el metal en la sangre.
          </p>

          <ul className="mx-auto mt-7 flex max-w-2xl flex-wrap justify-center gap-2 text-xs font-bold uppercase tracking-wide sm:text-sm">
            {[`${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(price)} c/u`, "Tallas S a 3XL", "Todas negras", "Estampado grande adelante"].map((t) => (
              <li key={t} className="rounded-md border border-white/15 bg-black/70 px-3 py-2 text-white">
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a
              href="#piezas"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#e11d2a] px-7 font-display text-2xl font-bold uppercase leading-none text-white shadow-[0_10px_30px_-8px_rgba(225,29,42,0.8)] transition hover:bg-[#ff2a38]"
            >
              Ver las {all.length} poleras <span aria-hidden="true">↓</span>
            </a>
            <a
              href={customizeHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-[#e11d2a] bg-black/70 px-6 font-display text-2xl font-bold uppercase leading-none text-white transition hover:bg-[#e11d2a]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Personaliza tu polera aquí
            </a>
          </div>
        </div>
      </section>

      {/* Song titles running across, like a tour shirt's back */}
      <div aria-hidden="true" className="overflow-hidden border-b border-white/10 bg-[#e11d2a] py-2.5 text-black">
        <div className="iron-marquee flex w-max gap-8 whitespace-nowrap font-display text-2xl font-bold uppercase leading-none">
          {[...SONGS, ...SONGS].map((s, i) => (
            <span key={i} className="flex items-center gap-8">
              {s}
              <span className="text-white">✦</span>
            </span>
          ))}
        </div>
      </div>

      {featured && (
        <section aria-label="Destacada" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <Link
            href={`/productos/${featured.slug}`}
            className="group grid overflow-hidden rounded-2xl border-2 border-[#e11d2a]/70 bg-[#0d0d0d] shadow-[0_0_60px_-18px_rgba(225,29,42,0.8)] transition hover:border-[#e11d2a] md:grid-cols-[1.15fr_1fr]"
          >
            <div className="relative aspect-square overflow-hidden bg-black md:aspect-auto md:min-h-[28rem]">
              {featured.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.image} alt={featured.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#e11d2a] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
                ★ Destacada
              </span>
            </div>
            <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#ff4b57]">Edición especial · Sublimada full color</p>
              <h2 className="font-display text-5xl font-bold uppercase leading-[0.88] sm:text-6xl">{featured.name.replace(/^Polera Iron Maiden\s*[–-]\s*/i, "")}</h2>
              {featured.description && <p className="line-clamp-4 text-sm leading-relaxed text-neutral-300">{featured.description}</p>}
              <ul className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-white">
                <li className="rounded-md border border-white/15 px-2.5 py-1">Full color adelante y atrás</li>
                {featuredSizes.length > 0 && <li className="rounded-md border border-white/15 px-2.5 py-1">Tallas {featuredSizes.join(", ")}</li>}
              </ul>
              <div className="mt-1 flex items-center justify-between gap-4">
                <span className="font-display text-5xl font-bold leading-none">{formatCLP(featured.price)}</span>
                <span className="inline-flex min-h-12 items-center rounded-md bg-[#e11d2a] px-7 font-display text-2xl font-bold uppercase leading-none text-white transition group-hover:bg-[#ff2a38]">
                  {featured.soldOut ? "Agotada" : "Comprar"}
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section id="piezas" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Elige tu Eddie</h2>
          <p className="text-sm text-neutral-400">Toca una polera para elegir tu talla.</p>
        </div>
        {items.length === 0 ? (
          <p className="py-16 text-center text-neutral-400">Muy pronto: estamos preparando la colección.</p>
        ) : (
          <ExclusiveGrid items={items} stripPrefix="Polera Iron Maiden – " />
        )}
      </section>

      <section className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-12 text-center">
          <p className="font-display text-5xl font-bold uppercase leading-none text-[#e11d2a] sm:text-6xl">Up the Irons!</p>
          <p className="max-w-md text-sm text-neutral-400">Edición exclusiva: cuando se acaben, se acaban. Envíos a todo Chile.</p>
          <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-300 transition hover:text-neon">
            ← Volver a la tienda
          </Link>
        </div>
      </section>
    </main>
  );
}
