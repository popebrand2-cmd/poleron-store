import type { Metadata } from "next";
import Link from "next/link";
import { Metal_Mania } from "next/font/google";
import { loadLimitedCards } from "@/lib/limited";
import ExclusiveGrid from "@/components/ExclusiveGrid";

export const dynamic = "force-dynamic";

// Heavy-metal lettering for the section title only (the rest of the page keeps the store's type).
const metal = Metal_Mania({ subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "Iron Maiden — Colección exclusiva POPE",
  description: "Poleras negras de Iron Maiden con el estampado grande adelante, $11.999, tallas S a 3XL. Agrégale tu diseño atrás por $17.999. Solo en POPE.",
};

// The artworks of the drop, behind the title like a wall of tour posters.
const POSTERS = ["eddie-londres", "the-trooper", "powerslave", "infinite-dreams", "las-caras-de-eddie", "eddie-hammer", "eddie-huaso", "eddie-faraon", "est-1975"];
const SONGS = ["Up the Irons", "The Trooper", "Powerslave", "Fear of the Dark", "Run to the Hills", "Aces High", "The Number of the Beast", "Wasted Years", "Hallowed Be Thy Name"];

// The Iron Maiden exclusive section: every Iron Maiden piece on sale, black tees with the big print on the front.
export default async function IronMaidenPage() {
  const items = (await loadLimitedCards()).filter((c) => /iron maiden/i.test(c.name) && !c.closed);
  const price = items.find((c) => !c.soldOut)?.price ?? items[0]?.price ?? 11999;

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
          <h1
            className={`${metal.className} mt-5 text-[3.6rem] leading-[0.95] text-[#e11d2a] sm:text-[6.5rem] lg:text-[8.5rem]`}
            style={{ textShadow: "0 0 2px #fff, 2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 0 10px 40px rgba(225,29,42,0.55)" }}
          >
            Iron Maiden
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
          <p className="mx-auto mt-4 max-w-lg text-sm text-neutral-300">
            ¿Quieres algo atrás? Agrégale <span className="font-bold text-white">tu propio diseño en la espalda</span> por{" "}
            <span className="font-bold text-neon">$17.999</span>: lo eliges en la página de cada polera.
          </p>
          <a
            href="#piezas"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#e11d2a] px-7 font-display text-2xl font-bold uppercase leading-none text-white shadow-[0_10px_30px_-8px_rgba(225,29,42,0.8)] transition hover:bg-[#ff2a38]"
          >
            Ver las {items.length} poleras <span aria-hidden="true">↓</span>
          </a>
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
          <p className={`${metal.className} text-5xl text-[#e11d2a] sm:text-6xl`}>Up the Irons!</p>
          <p className="max-w-md text-sm text-neutral-400">Edición exclusiva: cuando se acaben, se acaban. Envíos a todo Chile.</p>
          <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-300 transition hover:text-neon">
            ← Volver a la tienda
          </Link>
        </div>
      </section>
    </main>
  );
}
