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
  // The hero and "Así funciona" buttons go straight to the real editor: the Oversize hoodie
  // (falling back to any other hoodie, then any product).
  const isHoodie = (p: { name: string; slug: string }) => /hoodie|poler[oó]n/i.test(`${p.name} ${p.slug}`);
  const hoodie =
    products.find((p) => isHoodie(p) && /oversize/i.test(`${p.name} ${p.slug}`)) ?? products.find(isHoodie) ?? products[0];
  const editorHref = hoodie ? `/productos/${hoodie.slug}` : "#tienda";
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

      {/* Preset design collections: 3D carousel */}
      {collectionsWithDesigns.length > 0 && (
        <CollectionsShowcase
          collections={collectionsWithDesigns.map((c) => ({
            id: c.id,
            name: c.name,
            designs: c.designs.map((d) => ({ id: d.id, name: d.name, imageUrl: d.imageUrl })),
          }))}
          eyebrow={<EditableText value={t("collections.eyebrow")} siteKey="collections.eyebrow" as="span" />}
          heading={<EditableText value={t("collections.heading")} siteKey="collections.heading" as="span" />}
          subtext={<EditableText value={t("collections.subtext")} siteKey="collections.subtext" as="span" multiline />}
          cta={
            <EditableLink href={editorHref} className="pcol-view">
              <Txt k="collections.cta" />
              <span aria-hidden="true">↗</span>
            </EditableLink>
          }
        />
      )}

      <HowItWorks editorHref={editorHref} />

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
