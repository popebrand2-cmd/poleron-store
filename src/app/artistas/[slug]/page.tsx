import { thumb } from "@/lib/thumb";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEditorHref } from "@/lib/editor-product";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";

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
  const [artist, editorHref] = await Promise.all([loadArtist(slug), getEditorHref()]);
  if (!artist) notFound();

  const cover = artist.designs[0];
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
            <div className="aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_40px_90px_rgba(0,0,0,0.7)] ring-2 ring-neon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(cover.imageUrl, 640)} alt={artist.name} className="h-full w-full object-cover object-top" />
            </div>
          </div>
        </div>
      </section>

      <section id="catalogo" className="scroll-mt-24 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-5xl font-bold uppercase leading-none sm:text-6xl">
              <Txt k="artist.catalogTitle" />
            </h2>
            <Txt k="artist.catalogText" as="p" multiline className="mt-3 block text-neutral-400" />
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {artist.designs.map((d) => (
              <li key={d.id} className="group">
                <div className="glass glass-hover overflow-hidden rounded-2xl p-2.5">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb(d.imageUrl, 384)}
                      alt={d.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-3 truncate px-1 font-display text-2xl font-bold uppercase leading-none">{d.name}</p>
                  <EditableLink
                    href={designHref(d.id)}
                    className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon"
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
    </main>
  );
}
