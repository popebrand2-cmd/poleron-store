import Link from "next/link";
import { thumb } from "@/lib/thumb";

export type CategoryTile = { name: string; image: string; photo: boolean };

// One dark tile per section of the collections (Artistas, Anime…), each opening "Todas las colecciones" filtered on it.
// The picture is the photo of the section's first collection (or its first design when no collection has a photo).
export default function HomeCategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;
  const small = (url: string) => (/\.(png|jpe?g|webp)(\?|$)/i.test(url) ? thumb(url, 640) : url);
  return (
    <section aria-label="Secciones" className="bg-[#f5f5f3]">
      <ul
        className="mx-auto grid max-w-6xl gap-2 px-4 pb-8 sm:grid-cols-[repeat(var(--tiles),minmax(0,1fr))] sm:gap-3 sm:px-6 sm:pb-12"
        style={{ ["--tiles" as string]: String(Math.min(tiles.length, 3)) }}
      >
        {tiles.map((t) => (
          <li key={t.name}>
            <Link
              href={`/colecciones?categoria=${encodeURIComponent(t.name)}`}
              className="group relative flex h-14 items-end overflow-hidden rounded-md bg-neutral-900 sm:h-32 lg:h-36"
            >
              {t.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={small(t.image)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`absolute transition duration-500 group-hover:scale-105 ${
                    t.photo ? "inset-0 h-full w-full object-cover object-[50%_25%]" : "inset-y-0 right-10 h-full w-1/2 object-contain py-1 sm:right-14"
                  }`}
                />
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
              <span className="relative flex w-full items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-4">
                <span className="font-display text-2xl font-bold uppercase leading-none text-white sm:text-4xl">{t.name}</span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon text-black transition group-hover:translate-x-0.5 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
