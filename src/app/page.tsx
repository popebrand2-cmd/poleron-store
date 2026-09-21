import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CollectionCarousel from "@/components/CollectionCarousel";
import EditableText from "@/components/edit/EditableText";
import ValuesList from "@/components/edit/ValuesList";
import HowItWorksList from "@/components/edit/HowItWorksList";
import TrustBadgesList from "@/components/edit/TrustBadgesList";
import FaqList from "@/components/edit/FaqList";
import { siteText, CONTENT_DEFAULTS, DEFAULT_ACCENT_COLOR, type ContentSection } from "@/lib/site-content";

export const dynamic = "force-dynamic";

// Only two garment types exist today, so this maps straight to a slug each
// — once there's more than one product per type this should point at a
// real category listing instead of a single product.
const BROWSE_TYPES = [
  { label: "Polerones", match: (name: string) => /hoodie|poler[oó]n/i.test(name) },
  { label: "Poleras", match: (name: string) => /tee|polera/i.test(name) },
];

export default async function Home() {
  const [products, settings, designCollections, contentItems, siteTextRows] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { include: { views: true } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
    prisma.designCollection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { designs: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contentItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.siteText.findMany(),
  ]);
  const collectionsWithDesigns = designCollections.filter((c) => c.designs.length > 0);
  const heroImageUrl = settings?.heroImageUrl || "";
  const heroEyebrow = settings?.heroEyebrow || "POPE · Personalización 100% real";
  const heroHeadlineLines = (
    settings?.heroHeadline || "Diseña\ntu propia\nesencia."
  ).split("\n");
  const heroSubtext =
    settings?.heroSubtext ||
    "Sube tu diseño, personalízalo sobre la prenda real y mira el resultado antes de comprar. Sin catálogos genéricos — cada pieza sale exactamente como la imaginaste.";
  const heroCta = settings?.heroCta || "Personaliza aquí";
  const heroImageAlign = (settings?.heroImageAlign as "left" | "right") || "right";
  const heroImagePosX = settings?.heroImagePosX ?? 50;
  const heroImagePosY = settings?.heroImagePosY ?? 50;
  const heroImageZoom = settings?.heroImageZoom ?? 1;
  const accentColor = settings?.accentColor || DEFAULT_ACCENT_COLOR;

  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const t = (key: string) => siteText(textMap, key);

  function itemsFor(section: ContentSection) {
    const rows = contentItems.filter((c) => c.section === section);
    if (rows.length > 0) return rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text }));
    return CONTENT_DEFAULTS[section].map((d, i) => ({ id: `default-${section}-${i}`, ...d }));
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-black">
        {heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            id="hero-photo"
            src={heroImageUrl}
            alt="Prenda personalizada"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${heroImagePosX}% ${heroImagePosY}%`,
              transform: `scale(${heroImageZoom})`,
              transformOrigin: `${heroImagePosX}% ${heroImagePosY}%`,
            }}
          />
        )}

        {/* Legibility wash: bottom-heavy on mobile (stacked layout), side-heavy on desktop (split layout) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,_#000_0%,_rgba(0,0,0,0.6)_35%,_rgba(0,0,0,0.3)_65%,_rgba(0,0,0,0.15)_100%)] sm:hidden"
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 hidden sm:block ${
            heroImageAlign === "left"
              ? "bg-[linear-gradient(to_right,_rgba(0,0,0,0.2)_0%,_rgba(0,0,0,0.55)_45%,_rgba(0,0,0,0.92)_100%)]"
              : "bg-[linear-gradient(to_left,_rgba(0,0,0,0.2)_0%,_rgba(0,0,0,0.55)_45%,_rgba(0,0,0,0.92)_100%)]"
          }`}
        />

        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-6xl items-end px-6 py-16 sm:min-h-[600px] sm:items-center sm:py-20 md:min-h-[680px] md:py-28">
          <div
            className={`max-w-xl sm:max-w-[46%] lg:max-w-xl ${
              heroImageAlign === "left" ? "sm:ml-auto" : ""
            }`}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-neon" />
              <EditableText value={heroEyebrow} heroField="heroEyebrow" as="span" />
            </span>

            <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-7xl">
              {heroHeadlineLines.map((line, i) =>
                i === heroHeadlineLines.length - 1 ? (
                  <span key={i} className="text-neon">
                    {line}
                  </span>
                ) : (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ),
              )}
            </h1>

            <p className="mt-6 max-w-md text-neutral-400">
              <EditableText value={heroSubtext} heroField="heroSubtext" as="span" multiline />
            </p>

            <ValuesList initialItems={itemsFor("values")} />

            <div className="mt-10">
              <Link
                href="#tienda"
                className="group inline-flex items-center gap-5 rounded-full bg-neon py-3 pl-9 pr-3 text-lg font-bold uppercase tracking-wide text-black transition hover:brightness-90 sm:text-xl"
              >
                <EditableText value={heroCta} heroField="heroCta" as="span" />
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {!heroImageUrl && (
          <div className="absolute inset-0 hidden flex-col items-center justify-center gap-3 lg:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="h-20 w-20 text-neutral-800">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-6 3.5 4 2.5-3L20 16" />
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
            <p className="text-xs uppercase tracking-widest text-neutral-700">Foto próximamente</p>
          </div>
        )}
      </section>

      {/* Manifesto banner */}
      <section className="border-t border-neutral-800 bg-black py-14">
        <p className="mx-auto max-w-4xl px-6 text-center text-3xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-4xl lg:text-5xl">
          <EditableText value={t("manifesto.title")} siteKey="manifesto.title" as="span" />{" "}
          <span className="text-neon">
            <EditableText value={t("manifesto.titleAccent")} siteKey="manifesto.titleAccent" as="span" />
          </span>
        </p>
        <p className="mx-auto mt-5 max-w-lg px-6 text-center text-sm text-neutral-400">
          <EditableText value={t("manifesto.subtext")} siteKey="manifesto.subtext" as="span" multiline />
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("howItWorks.eyebrow")} siteKey="howItWorks.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              <EditableText value={t("howItWorks.heading")} siteKey="howItWorks.heading" as="span" />
            </h2>
          </div>
          <HowItWorksList initialItems={itemsFor("howItWorks")} />
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <TrustBadgesList initialItems={itemsFor("trustBadges")} />
        </div>
      </section>

      {/* Browse by garment type */}
      <section className="bg-black">
        <div className="border-y border-neutral-800 bg-neutral-950 py-3 text-center">
          <h2 className="text-lg font-extrabold uppercase tracking-widest text-white">
            <span className="text-neon">POPE</span> ·{" "}
            <EditableText value={t("browseTypes.heading")} siteKey="browseTypes.heading" as="span" />
          </h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 py-10 sm:grid-cols-2">
          {BROWSE_TYPES.map((tp) => {
            const product = products.find((p) => tp.match(p.name));
            if (!product) return null;
            const cover = product.colors[0]?.views[0]?.imageUrl;
            return (
              <Link
                key={tp.label}
                href={`/productos/${product.slug}`}
                style={{ backgroundColor: `${accentColor}b3` }}
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-transparent p-6 transition hover:border-neon"
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={tp.label}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute bottom-4 left-4 rounded bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-black shadow">
                  {tp.label} →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section id="tienda" className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("featured.eyebrow")} siteKey="featured.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              <EditableText value={t("featured.heading")} siteKey="featured.heading" as="span" />
            </h2>
            <p className="mt-2 text-neutral-400">
              <EditableText value={t("featured.subtext")} siteKey="featured.subtext" as="span" />
            </p>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-neutral-500">Todavía no hay productos publicados.</p>
          ) : (
            <FeaturedCarousel
              products={products.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                basePrice: p.basePrice,
                colors: p.colors.map((c) => ({
                  name: c.name,
                  hex: c.hex,
                  imageUrl: c.views[0]?.imageUrl ?? null,
                })),
              }))}
            />
          )}
        </div>
      </section>

      {/* Preset design collections */}
      {collectionsWithDesigns.length > 0 && (
        <section id="colecciones" className="border-t border-neutral-800 bg-black">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-10 text-center">
              <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
                <span className="h-px w-8 bg-neon" />
                <EditableText value={t("collections.eyebrow")} siteKey="collections.eyebrow" as="span" />
                <span className="h-px w-8 bg-neon" />
              </p>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
                <EditableText value={t("collections.heading")} siteKey="collections.heading" as="span" />
              </h2>
              <p className="mt-2 text-neutral-400">
                <EditableText value={t("collections.subtext")} siteKey="collections.subtext" as="span" multiline />
              </p>
            </div>

            <div className="space-y-10">
              {collectionsWithDesigns.map((c) => (
                <div key={c.id}>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">{c.name}</h3>
                  <CollectionCarousel designs={c.designs} />
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="#tienda"
                className="group inline-flex items-center gap-4 rounded-full bg-neon py-2 pl-6 pr-2 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
              >
                Personaliza aquí
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-neon transition group-hover:translate-x-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("faq.eyebrow")} siteKey="faq.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              <EditableText value={t("faq.heading")} siteKey="faq.heading" as="span" />
            </h2>
          </div>
          <FaqList initialItems={itemsFor("faq")} />
        </div>
      </section>
    </main>
  );
}
