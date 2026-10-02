import { thumb } from "@/lib/thumb";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEditorHref } from "@/lib/editor-product";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import CollectionGarmentsGrid, { type GarmentKind, type GarmentItem } from "@/components/CollectionGarmentsGrid";
import { getCollectionMockups } from "@/lib/collection-mockups";
import { garmentKind } from "@/lib/garments";

const KIND_TITLE: Record<GarmentKind, string> = { polera: "Polera", poleron: "Polerón oversize", boxy: "Polerón boxy fit" };

export const dynamic = "force-dynamic";

async function loadArtist(slug: string) {
  const c = await prisma.designCollection.findUnique({
    where: { slug },
    include: { designs: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
  return c && c.active && c.designs.length > 0 ? c : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await loadArtist(slug);
  return { title: artist ? `${artist.name} — Colección POPE` : "Colección — POPE" };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [artist, editorHref, products, mockups] = await Promise.all([
    loadArtist(slug),
    getEditorHref(),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { orderBy: { sortOrder: "asc" }, include: { views: { orderBy: { sortOrder: "asc" } } } } },
    }),
    getCollectionMockups(slug),
  ]);
  if (!artist) notFound();

  // Every garment that has a photo to print on, shown with each of this collection's designs already on it.
  const garments = products
    .map((p) => ({
      ...p,
      colors: p.colors
        .map((c) => ({
          name: c.name,
          hex: c.hex,
          views: c.views
            .filter((v) => v.imageUrl)
            .map((v) => ({ label: v.label, imageUrl: v.imageUrl, zoneXPct: v.zoneXPct, zoneYPct: v.zoneYPct, zoneWidthPct: v.zoneWidthPct, zoneHeightPct: v.zoneHeightPct })),
        }))
        .filter((c) => c.views.length > 0),
    }))
    .filter((p) => p.colors.length > 0);

  // Finished mockups (one image per garment type and color, made outside the site) win when they exist for
  // this collection; each links to the real product of that type with the collection's first design loaded.
  const mockupItems: GarmentItem[] = (Object.keys(KIND_TITLE) as GarmentKind[]).flatMap((kind) => {
    const list = mockups[kind];
    if (!list || list.length === 0) return [];
    const product = products.find((p) => garmentKind(p) === kind);
    const base = product ? `/productos/${product.slug}` : editorHref;
    return [
      {
        key: `${artist.id}-${kind}`,
        kind,
        href: `${base}${base.includes("?") ? "&" : "?"}diseno=${artist.designs[0].id}`,
        title: `${KIND_TITLE[kind]} ${artist.name}`,
        description: product?.description || undefined,
        basePrice: product?.basePrice ?? null,
        compareAtPrice: product?.compareAtPrice ?? null,
        colors: list.map((m) => ({ name: m.name, hex: m.hex, views: [], imageUrl: m.imageUrl })),
      },
    ];
  });
  const overlayItems: GarmentItem[] = artist.designs.flatMap((d) =>
    garments.map((p) => ({
      key: `${d.id}-${p.id}`,
      kind: garmentKind(p),
      href: `/productos/${p.slug}?diseno=${d.id}`,
      title: `${p.name} ${d.name}`,
      description: p.description || undefined,
      frontArt: d.showFront ? d.imageUrl : "",
      backArt: d.showBack ? d.backImageUrl || d.imageUrl : "",
      frontScale: d.frontScale,
      backScale: d.backScale,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      colors: p.colors,
    })),
  );
  const garmentItems = mockupItems.length > 0 ? mockupItems : overlayItems;

  const cover = artist.designs[0];
  // The artist's own photo leads the page; the first design is only the fallback when none was uploaded.
  const heroImage = artist.photoUrl || cover.imageUrl;
  const heroIsPhoto = !!artist.photoUrl;
  const designHref = (id: string) => `${editorHref}${editorHref.includes("?") ? "&" : "?"}diseno=${id}`;

  return (
    <main className="bg-black text-white">
      <section className="relative isolate overflow-hidden border-b border-neutral-800">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ background: "radial-gradient(70% 70% at 78% 40%, color-mix(in srgb, var(--neon) 30%, transparent), transparent 70%), radial-gradient(50% 50% at 5% 0%, color-mix(in srgb, var(--neon) 14%, transparent), transparent 70%)" }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-6 py-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <Link href="/#colecciones" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 transition hover:text-neon">
              <span aria-hidden="true">←</span>
              <Txt k="artist.back" />
            </Link>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-neon">
              <Txt k="artist.eyebrow" />
            </p>
            <h1 className="font-display text-[4.5rem] font-bold uppercase leading-[0.82] sm:text-[7.5rem]">{artist.name}</h1>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {artist.designs.length} {artist.designs.length === 1 ? "diseño" : "diseños"}
            </p>
            <a
              href="#catalogo"
              className="pcol-view mt-8"
            >
              <Txt k="artist.cta" />
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-900 shadow-[0_40px_90px_rgba(0,0,0,0.7)] ring-2 ring-neon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(heroImage, 640)} alt={artist.name} className={`h-full w-full ${heroIsPhoto ? "object-cover object-top" : "object-contain object-center"}`} />
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo" className="scroll-mt-24 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
          <div className="mb-5 max-w-2xl">
            <h2 className="font-display text-3xl font-bold uppercase leading-none sm:text-4xl">
              <Txt k="artist.catalogTitle" />
            </h2>
            <Txt k="artist.catalogText" as="p" multiline className="mt-2 block text-sm text-neutral-400" />
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {artist.designs.map((d) => (
              <li key={d.id} className="group">
                <div className="glass glass-hover overflow-hidden rounded-xl p-1.5">
                  <div className="aspect-square overflow-hidden rounded-lg bg-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb(d.imageUrl, 384)}
                      alt={d.name}
                      loading="lazy"
                      className="h-full w-full object-contain object-center transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-1.5 truncate px-0.5 font-display text-base font-bold uppercase leading-none">{d.name}</p>
                  <EditableLink
                    href={designHref(d.id)}
                    className="mt-1.5 flex min-h-8 w-full items-center justify-center gap-1 rounded-full border-2 border-black bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon"
                  >
                    <Txt k="artist.designCta" />
                    <span aria-hidden="true">→</span>
                  </EditableLink>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {garmentItems.length > 0 && (
        <section id="prendas" className="scroll-mt-24 border-t border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
                <Txt k="artist.garmentsTitle" />
              </h2>
              <Txt k="artist.garmentsText" as="p" multiline className="mt-3 block text-neutral-400" />
            </div>
            <CollectionGarmentsGrid items={garmentItems} />
          </div>
        </section>
      )}
    </main>
  );
}
