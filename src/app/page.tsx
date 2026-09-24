import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import EditableText from "@/components/edit/EditableText";
import EditableLink from "@/components/edit/EditableLink";
import Txt from "@/components/edit/Txt";
import PopeHero from "@/components/PopeHero";
import RealWorks from "@/components/RealWorks";
import RealVideos from "@/components/RealVideos";
import HowItWorks from "@/components/preview/HowItWorks";
import TrustBadgesList from "@/components/edit/TrustBadgesList";
import FaqList from "@/components/edit/FaqList";
import { getEditorHref } from "@/lib/editor-product";
import { siteText, CONTENT_DEFAULTS, type ContentSection } from "@/lib/site-content";

export const dynamic = "force-dynamic";


export default async function Home() {
  const [products, designCollections, contentItems, siteTextRows] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      include: { colors: { include: { views: true } } },
    }),
    prisma.designCollection.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { designs: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contentItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.siteText.findMany(),
  ]);
  const editorHref = await getEditorHref();
  const collectionsWithDesigns = designCollections.filter((c) => c.designs.length > 0);

  const textMap = Object.fromEntries(siteTextRows.map((t) => [t.key, t.value]));
  const t = (key: string) => siteText(textMap, key);

  function itemsFor(section: ContentSection) {
    const rows = contentItems.filter((c) => c.section === section);
    if (rows.length > 0) return rows.map((r) => ({ id: r.id, icon: r.icon, title: r.title, text: r.text }));
    return CONTENT_DEFAULTS[section].map((d, i) => ({ id: `default-${section}-${i}`, ...d }));
  }

  return (
    <main>
      <PopeHero editorHref={editorHref} />

      {/* Artist collections: 3D carousel (each card opens its own catalog page) */}
      {collectionsWithDesigns.length > 0 && (
        <CollectionsShowcase
          artists={collectionsWithDesigns.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            imageUrl: c.designs[0].imageUrl,
            category: c.category,
            count: c.designs.length,
          }))}
          eyebrow={<EditableText value={t("collections.eyebrow")} siteKey="collections.eyebrow" as="span" />}
          heading={<EditableText value={t("collections.heading")} siteKey="collections.heading" as="span" />}
          ctaLabel={<Txt k="collections.cta" />}
        />
      )}

      {/* Featured */}
      <section id="tienda" className="bg-black">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("featured.eyebrow")} siteKey="featured.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-4xl font-bold uppercase text-white sm:text-5xl">
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

      <HowItWorks editorHref={editorHref} />

      {/* Vertical videos of finished garments, as a hand of cards (hidden until the owner uploads some) */}
      <RealVideos />

      {/* Photos of real, finished garments (hidden until the owner uploads some) */}
      <RealWorks />

      {/* FAQ */}
      <section className="border-t border-neutral-800 bg-neutral-950">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="mb-10 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-neon">
              <span className="h-px w-8 bg-neon" />
              <EditableText value={t("faq.eyebrow")} siteKey="faq.eyebrow" as="span" />
              <span className="h-px w-8 bg-neon" />
            </p>
            <h2 className="text-4xl font-bold uppercase text-white sm:text-5xl">
              <EditableText value={t("faq.heading")} siteKey="faq.heading" as="span" />
            </h2>
          </div>
          <FaqList initialItems={itemsFor("faq")} />
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-neutral-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <TrustBadgesList initialItems={itemsFor("trustBadges")} />
        </div>
      </section>
    </main>
  );
}
