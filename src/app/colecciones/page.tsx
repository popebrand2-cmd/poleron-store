import type { Metadata } from "next";
import Link from "next/link";
import CollectionsBrowser from "@/components/CollectionsBrowser";
import { loadShowcaseItems } from "@/lib/collection-items";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todas las colecciones — POPE",
  description: "Poleras y polerones de todas las colecciones POPE, con el diseño ya estampado por delante y por detrás. Filtra por colección y llévate el tuyo.",
};

export default async function CollectionsPage() {
  const items = await loadShowcaseItems(1000);

  return (
    <main className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-neon">
          <span aria-hidden="true">←</span>
          Volver al inicio
        </Link>
        <h1 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">Todas las colecciones</h1>
        <p className="mt-3 max-w-2xl text-neutral-400">Poleras y polerones con el diseño ya estampado por delante y por detrás. Toca una para comprarla, o «+ Personalizar» para ponerle tu propio diseño.</p>

        <div className="mt-8">
          {items.length === 0 ? (
            <p className="py-16 text-center text-neutral-400">Muy pronto: estamos preparando las colecciones.</p>
          ) : (
            <CollectionsBrowser items={items} />
          )}
        </div>
      </div>
    </main>
  );
}
