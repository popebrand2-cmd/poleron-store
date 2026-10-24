import Link from "next/link";
import { thumb } from "@/lib/thumb";

// photo: the section's first collection photo ("" = none); designs: the art of its first collections, fanned out on the
// right when there is no photo; collections: how many collections the section has.
export type CategoryTile = { name: string; photo: string; designs: string[]; collections: number };

const small = (url: string) => (/\.(png|jpe?g|webp)(\?|$)/i.test(url) ? thumb(url, 384) : url);
// Three designs fanned out like cards on a table: back left, back right, front centre.
const FAN = ["right-[30%] rotate-[-9deg]", "right-[6%] rotate-[8deg]", "right-[17%] z-[1] rotate-[-1deg] scale-110"];

// One dark tile per section of the collections (Artistas, Anime…), each opening "Todas las colecciones" filtered on it.
export default function HomeCategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;
  return (
    // -mt-px: sits flush on the shelf above (same background) without a hairline seam between the two.
    <section aria-label="Secciones" data-tone="light" className="-mt-px bg-[#f5f5f3]">
      <ul
        className="mx-auto grid max-w-6xl gap-2 px-4 pb-8 sm:grid-cols-[repeat(var(--tiles),minmax(0,1fr))] sm:gap-3 sm:px-6 sm:pb-12"
        style={{ ["--tiles" as string]: String(Math.min(tiles.length, 3)) }}
      >
        {tiles.map((t) => (
          <li key={t.name}>
            <Link
              href={`/colecciones?categoria=${encodeURIComponent(t.name)}`}
              className="group relative flex h-16 items-end overflow-hidden rounded-md bg-[radial-gradient(ellipse_at_80%_40%,#2a2f22_0%,#111_70%)] sm:h-32 lg:h-36"
            >
              {t.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={small(t.photo)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-[50%_25%] transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
              ) : (
                <span aria-hidden="true" className="absolute inset-y-0 right-10 w-1/2 sm:right-14">
                  {t.designs.map((d, n) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={d + n}
                      src={small(d)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`absolute top-1/2 h-[78%] w-auto -translate-y-1/2 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)] transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-[55%] ${FAN[(t.designs.length === 1 ? 2 : n) % 3]}`}
                    />
                  ))}
                </span>
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/5" />
              <span className="relative flex w-full items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-4">
                <span>
                  <span className="block font-display text-2xl font-bold uppercase leading-none text-white sm:text-4xl">{t.name}</span>
                  <span className="mt-1 hidden text-xs font-medium text-white/70 sm:block">
                    {t.collections} {t.collections === 1 ? "colección" : "colecciones"}
                  </span>
                </span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon text-black transition duration-300 group-hover:translate-x-1 group-hover:shadow-[0_0_18px_color-mix(in_srgb,var(--neon)_60%,transparent)] sm:h-10 sm:w-10">
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
